import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

// Initialize Supabase client with SERVICE_ROLE_KEY for admin operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Initialize a separate Supabase client with ANON_KEY for JWT verification
const supabaseAnon = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_ANON_KEY') || ''
);

// Bucket name for storing item photos
const BUCKET_NAME = 'make-4452b5a8-lost-found-photos';

// Initialize storage bucket
const initBucket = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: false });
      console.log('Created storage bucket:', BUCKET_NAME);
    }
  } catch (error) {
    console.error('Bucket initialization error:', error);
  }
};

// Sync auth users to profiles table
const syncProfilesToDatabase = async () => {
  try {
    console.log('========================================');
    console.log('[Server Init] SYNCING AUTH USERS TO PROFILES TABLE');
    console.log('========================================');
    
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('[Server Init] ❌ Error fetching auth users:', authError);
      return;
    }

    const authUsers = authUsersData?.users || [];
    console.log(`[Server Init] 📊 Found ${authUsers.length} users in auth.users`);
    
    if (authUsers.length === 0) {
      console.log('[Server Init] ⚠️  No users found in auth system');
      return;
    }
    
    // CRITICAL: Check for and remove duplicate auth users (same email, different ID)
    console.log('\n[Server Init] 🔍 Checking for duplicate auth users...');
    const emailToUsers = new Map<string, typeof authUsers>();
    
    for (const user of authUsers) {
      if (!user.email) continue;
      
      if (!emailToUsers.has(user.email)) {
        emailToUsers.set(user.email, [user]);
      } else {
        emailToUsers.get(user.email)!.push(user);
      }
    }
    
    // Find and remove duplicates (keep the oldest one)
    let duplicatesRemoved = 0;
    for (const [email, users] of emailToUsers.entries()) {
      if (users.length > 1) {
        console.log(`[Server Init] ⚠️  Found ${users.length} auth users with email: ${email}`);
        
        // Sort by created_at to keep the oldest
        users.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const keepUser = users[0];
        const deleteUsers = users.slice(1);
        
        console.log(`[Server Init] ✅ Keeping oldest user: ${keepUser.id} (created: ${keepUser.created_at})`);
        
        for (const duplicateUser of deleteUsers) {
          console.log(`[Server Init] 🗑️  Deleting duplicate: ${duplicateUser.id} (created: ${duplicateUser.created_at})`);
          
          // Delete from auth
          const { error: delError } = await supabase.auth.admin.deleteUser(duplicateUser.id);
          if (delError) {
            console.error(`[Server Init] ❌ Failed to delete duplicate auth user ${duplicateUser.id}:`, delError);
          } else {
            duplicatesRemoved++;
            
            // Also delete their profile if it exists
            await supabase.from('profiles').delete().eq('id', duplicateUser.id);
          }
        }
      }
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`[Server Init] 🧹 Removed ${duplicatesRemoved} duplicate auth users`);
      
      // Re-fetch the clean list
      const { data: cleanAuthData } = await supabase.auth.admin.listUsers();
      authUsers.length = 0;
      authUsers.push(...(cleanAuthData?.users || []));
      console.log(`[Server Init]  After cleanup: ${authUsers.length} users`);
    } else {
      console.log('[Server Init] ✓ No duplicate auth users found');
    }
    
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const authUser of authUsers) {
      try {
        console.log(`\n[Server Init] Processing: ${authUser.email} (ID: ${authUser.id})`);
        
        // Check if profile already exists using ID (primary key) - don't use .single()
        const { data: existingProfiles, error: checkError } = await supabase
          .from('profiles')
          .select('id, email, status')
          .eq('id', authUser.id);

        if (checkError) {
          console.error(`[Server Init] ❌ Error checking profile for ${authUser.email}:`, checkError);
          errors++;
          continue;
        }

        if (existingProfiles && existingProfiles.length > 0) {
          const existingProfile = existingProfiles[0];
          console.log(`[Server Init] ✓ Profile already exists for ${authUser.email} (Status: ${existingProfile.status})`);
          skipped++;
          continue;
        }

        // Also check by email in case same email exists with different ID
        const { data: emailProfiles, error: emailCheckError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', authUser.email);

        if (!emailCheckError && emailProfiles && emailProfiles.length > 0) {
          // Email exists but with different ID - delete old profile first
          console.log(`[Server Init] 🔄 Email ${authUser.email} exists with different ID, cleaning up...`);
          await supabase
            .from('profiles')
            .delete()
            .eq('email', authUser.email);
        }

        // Create profile
        console.log(`[Server Init] 📝 Creating new profile for ${authUser.email}...`);
        const profileData = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
          status: authUser.banned_until ? 'disabled' : 'active',
          type: authUser.user_metadata?.role || 'student',
          created_at: authUser.created_at
        };
        
        console.log('[Server Init] Profile data:', profileData);
        
        // Use insert since we've already cleaned up conflicts
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          console.error(`[Server Init] ❌ Error creating profile for ${authUser.email}:`, insertError);
          errors++;
        } else {
          synced++;
          console.log(`[Server Init] ✅ Successfully synced profile for ${authUser.email}`);
        }
      } catch (error) {
        console.error(`[Server Init] ❌ Exception processing ${authUser.email}:`, error);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log('[Server Init] SYNC COMPLETE');
    console.log(`[Server Init] ✅ Synced: ${synced}`);
    console.log(`[Server Init] ⏭️  Skipped: ${skipped}`);
    console.log(`[Server Init] ❌ Errors: ${errors}`);
    console.log(`[Server Init] 📊 Total: ${authUsers.length}`);
    console.log('========================================\n');
  } catch (error) {
    console.error('[Server Init] ❌ Fatal error in profile sync:', error);
  }
};

// Ensure admin account exists on startup
const ensureAdminAccount = async () => {
  try {
    console.log('========================================');
    console.log('[Server Init] ENSURING ADMIN ACCOUNT EXISTS');
    console.log('========================================');
    
    const ADMIN_EMAIL = 'admin@school.edu';
    const ADMIN_PASSWORD = 'password123';
    
    // Check if admin account exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === ADMIN_EMAIL);
    
    if (adminExists) {
      console.log('[Server Init] ✓ Admin account already exists:', ADMIN_EMAIL);
    } else {
      console.log('[Server Init] Creating admin account:', ADMIN_EMAIL);
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        user_metadata: { role: 'admin' },
        email_confirm: true,
      });
      
      if (error) {
        console.error('[Server Init] ❌ Failed to create admin account:', error);
      } else {
        console.log('[Server Init] ✅ Admin account created successfully');
        console.log('[Server Init] Email:', ADMIN_EMAIL);
        console.log('[Server Init] Password:', ADMIN_PASSWORD);
      }
    }
    
    console.log('========================================\n');
  } catch (error) {
    console.error('[Server Init] ❌ Error ensuring admin account:', error);
  }
};

// Initialize bucket and sync profiles on startup
initBucket();
ensureAdminAccount();
syncProfilesToDatabase();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-4452b5a8/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint (only used for manual account creation, not automatic)
app.post("/make-server-4452b5a8/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Determine user role based on email
    let role = 'student';
    if (email.startsWith('admin') && email.endsWith('@school.edu')) {
      role = 'admin';
    } else {
      // Validate student email format: s[six numbers]@school.edu
      const studentEmailRegex = /^s\d{6}@school\.edu$/;
      if (!studentEmailRegex.test(email)) {
        return c.json({ error: 'Invalid email format. Students must use s[6-digit-number]@school.edu, admins use admin*@school.edu' }, 400);
      }
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { role },
      email_confirm: true
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: 'Failed to create user: ' + error.message }, 400);
    }

    return c.json({ 
      message: 'User created successfully',
      user: { id: data.user?.id, email: data.user?.email, role }
    });
  } catch (error) {
    console.error('Error in /signup endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Initialize demo accounts (check if they exist, create only if needed)
app.post("/make-server-4452b5a8/initialize-accounts", async (c) => {
  try {
    console.log('=== Starting account initialization ===');
    
    const DEMO_ACCOUNTS = [
      // Admin account
      { email: 'admin@school.edu', password: 'password123', role: 'admin' },
    ];

    const results = {
      created: [] as string[],
      existing: [] as string[],
      errors: [] as string[],
    };

    // Fetch all existing users ONCE
    console.log('Fetching existing users...');
    const { data: existingUsersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return c.json({ error: 'Failed to list users: ' + listError.message }, 500);
    }

    const existingEmails = new Set(existingUsersData?.users?.map(u => u.email) || []);
    console.log('Found existing users:', Array.from(existingEmails));

    // Process each account
    for (const account of DEMO_ACCOUNTS) {
      try {
        if (existingEmails.has(account.email)) {
          results.existing.push(account.email);
          console.log(`✓ Account already exists: ${account.email}`);
        } else {
          // Create new user
          console.log(`Creating account: ${account.email}`);
          const { data, error } = await supabase.auth.admin.createUser({
            email: account.email,
            password: account.password,
            user_metadata: { role: account.role },
            email_confirm: true,
          });

          if (error) {
            console.error(`✗ Failed to create ${account.email}:`, error.message);
            results.errors.push(`${account.email}: ${error.message}`);
          } else {
            results.created.push(account.email);
            console.log(`✓ Created account: ${account.email} with role: ${account.role}`);
          }
        }
      } catch (error) {
        console.error(`✗ Error processing ${account.email}:`, error);
        results.errors.push(`${account.email}: ${error.message}`);
      }
    }

    console.log('=== Account initialization complete ===');
    console.log('Summary:', {
      created: results.created.length,
      existing: results.existing.length,
      errors: results.errors.length
    });

    return c.json({
      message: 'Account initialization complete',
      results,
    });
  } catch (error) {
    console.error('Error in /initialize-accounts endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Verify token and get user role
app.get("/make-server-4452b5a8/auth/me", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    return c.json({ 
      user: {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'student'
      }
    });
  } catch (error) {
    console.error('Error in /auth/me endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Get all found items (approved or pending)
app.get("/make-server-4452b5a8/items", async (c) => {
  try {
    const status = c.req.query("status"); // "approved", "pending", or undefined for all
    
    let query = supabase.from('reporteditems').select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching items:', error);
      return c.json({ error: 'Failed to fetch items: ' + error.message }, 500);
    }

    // Generate signed URLs for photos
    const items = await Promise.all((data || []).map(async (item) => {
      let photoUrl = null;
      let description = item.description || '';
      
      // Try to parse description as JSON to extract photo_url
      try {
        const descData = JSON.parse(item.description);
        if (descData.photo_url) {
          // Generate signed URL
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(descData.photo_url, 3600); // URL valid for 1 hour
          
          if (!signedUrlError && signedUrlData) {
            photoUrl = signedUrlData.signedUrl;
          }
          
          description = descData.text || '';
        }
      } catch (e) {
        // Not JSON, treat as plain text description
        description = item.description || '';
      }

      return {
        id: item.id,
        itemName: item.name,
        category: item.category,
        description: description,
        location: item.location,
        foundDate: item.date,
        status: item.status,
        createdAt: item.created_at,
        photoUrl
      };
    }));

    return c.json({ items });
  } catch (error) {
    console.error('Error in /items endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Submit a found item
app.post("/make-server-4452b5a8/items", async (c) => {
  try {
    const body = await c.req.json();
    const { itemName, category, description, location, foundDate, contactEmail, photoData } = body;

    if (!itemName || !category || !location || !foundDate || !contactEmail) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const itemId = crypto.randomUUID();
    let photoPath = null;

    // Upload photo if provided
    if (photoData) {
      try {
        // Convert base64 to blob
        const base64Data = photoData.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        photoPath = `items/${itemId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(photoPath, binaryData, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          photoPath = null;
        }
      } catch (uploadError) {
        console.error('Photo processing error:', uploadError);
        photoPath = null;
      }
    }

    // Store description and photo URL as JSON if photo exists, otherwise plain text
    let descriptionField = description || '';
    if (photoPath) {
      descriptionField = JSON.stringify({
        text: description || '',
        photo_url: photoPath
      });
    }

    // Insert into reporteditems table
    const { error } = await supabase
      .from('reporteditems')
      .insert({
        name: itemName,
        category: category,
        description: descriptionField,
        location: location,
        date: foundDate,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating item:', error);
      return c.json({ error: 'Failed to create item: ' + error.message }, 500);
    }

    return c.json({ itemId, message: 'Item submitted successfully and awaiting approval' });
  } catch (error) {
    console.error('Error in POST /items endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Submit a claim request
app.post("/make-server-4452b5a8/claims", async (c) => {
  try {
    const body = await c.req.json();
    const { itemId, claimerName, claimerEmail, claimerPhone, description } = body;

    if (!itemId || !claimerName || !claimerEmail || !description) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Store claim in lostitems table using existing schema
    // We'll encode the claim data in existing fields
    const claimData = {
      itemId,
      claimerEmail,
      claimerPhone: claimerPhone || '',
      verificationDetails: description
    };

    const { error } = await supabase
      .from('lostitems')
      .insert({
        name: claimerName,
        description: JSON.stringify(claimData), // Store claim details as JSON
        location: itemId, // Store item_id in location field
        category: 'CLAIM', // Special category to identify claims
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error creating claim:', error);
      return c.json({ error: 'Failed to create claim: ' + error.message }, 500);
    }

    return c.json({ message: 'Claim submitted successfully' });
  } catch (error) {
    console.error('Error in POST /claims endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Admin: Get all claims
app.get("/make-server-4452b5a8/admin/claims", async (c) => {
  try {
    // Fetch claims from lostitems table where category = 'CLAIM'
    const { data, error } = await supabase
      .from('lostitems')
      .select('*')
      .eq('category', 'CLAIM')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching claims:', error);
      return c.json({ error: 'Failed to fetch claims: ' + error.message }, 500);
    }

    const claims = (data || []).map(claim => {
      let claimData = { itemId: '', claimerEmail: '', claimerPhone: '', verificationDetails: '' };
      
      try {
        claimData = JSON.parse(claim.description || '{}');
      } catch (e) {
        console.error('Error parsing claim data:', e);
      }

      return {
        id: claim.id,
        itemId: claimData.itemId || claim.location, // Stored in location field
        claimerName: claim.name,
        claimerEmail: claimData.claimerEmail || '',
        claimerPhone: claimData.claimerPhone || '',
        description: claimData.verificationDetails || claim.description,
        status: claim.status,
        createdAt: claim.created_at
      };
    });

    return c.json({ claims });
  } catch (error) {
    console.error('Error in /admin/claims endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Admin: Get all data (items + claims)
app.get("/make-server-4452b5a8/admin/data", async (c) => {
  try {
    console.log('[Admin Data] Fetching data from new tables...');
    
    // Fetch items from reporteditems table
    const { data: itemsData, error: itemsError } = await supabase
      .from('reporteditems')
      .select('*')
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('[Admin Data] Error fetching items:', itemsError);
      return c.json({ error: 'Failed to fetch items: ' + itemsError.message }, 500);
    }

    // Fetch claims from lostitems table where category = 'CLAIM'
    const { data: claimsData, error: claimsError } = await supabase
      .from('lostitems')
      .select('*')
      .eq('category', 'CLAIM')
      .order('created_at', { ascending: false });

    if (claimsError) {
      console.error('[Admin Data] Error fetching claims:', claimsError);
      return c.json({ error: 'Failed to fetch claims: ' + claimsError.message }, 500);
    }

    const items = (itemsData || []).map(item => ({
      id: item.id,
      itemName: item.name,
      category: item.category,
      description: item.description,
      location: item.location,
      foundDate: item.date,
      contactEmail: '',
      status: item.status,
      createdAt: item.created_at,
      photoUrl: null
    }));

    const claims = (claimsData || []).map(claim => {
      let claimData = { itemId: '', claimerEmail: '', claimerPhone: '', verificationDetails: '' };
      
      try {
        claimData = JSON.parse(claim.description || '{}');
      } catch (e) {
        console.error('Error parsing claim data:', e);
      }

      return {
        id: claim.id,
        itemId: claimData.itemId || claim.location,
        claimerName: claim.name,
        claimerEmail: claimData.claimerEmail || '',
        claimerPhone: claimData.claimerPhone || '',
        description: claimData.verificationDetails || claim.description,
        status: claim.status,
        createdAt: claim.created_at
      };
    });

    console.log('[Admin Data] Returning', items.length, 'items and', claims.length, 'claims');

    return c.json({ items, claims });
  } catch (error) {
    console.error('[Admin Data] Error:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Admin: Approve/reject item
app.put("/make-server-4452b5a8/admin/items/:id", async (c) => {
  try {
    const itemId = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    if (!status || !['approved', 'rejected', 'claimed'].includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const { error: updateError } = await supabase
      .from('reporteditems')
      .update({ status })
      .eq('id', itemId);

    if (updateError) {
      console.error('Error updating item:', updateError);
      return c.json({ error: 'Failed to update item: ' + updateError.message }, 500);
    }

    return c.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error in /admin/items/:id endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Admin: Update claim status
app.put("/make-server-4452b5a8/admin/claims/:id", async (c) => {
  try {
    const claimId = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    console.log(`[PUT /admin/claims/${claimId}] Updating claim status to: ${status}`);

    const { data, error } = await supabase
      .from('lostitems')
      .update({ status })
      .eq('id', claimId)
      .eq('category', 'CLAIM')
      .select();

    if (error) throw error;

    console.log(`[PUT /admin/claims/${claimId}] Claim updated successfully`);

    return c.json({ message: `Claim ${status} successfully` });
  } catch (error) {
    console.error('Error in PUT /admin/claims endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Admin: Delete claim
app.delete("/make-server-4452b5a8/admin/claims/:id", async (c) => {
  try {
    const claimId = c.req.param('id');
    
    console.log(`[DELETE /admin/claims/${claimId}] Deleting claim`);

    const { error } = await supabase
      .from('lostitems')
      .delete()
      .eq('id', claimId)
      .eq('category', 'CLAIM');

    if (error) throw error;

    console.log(`[DELETE /admin/claims/${claimId}] Claim deleted successfully`);

    return c.json({ message: 'Claim deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /admin/claims endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Admin: Delete user account
app.delete("/make-server-4452b5a8/admin/users/:id", async (c) => {
  try {
    const userId = c.req.param('id');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    // Verify the requester is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized: Admin access required' }, 401);
    }

    // Prevent admins from deleting themselves
    if (userId === user.id) {
      return c.json({ error: 'You cannot delete your own account' }, 400);
    }

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      return c.json({ error: 'Failed to delete user: ' + error.message }, 500);
    }

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /admin/users endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// ==================== DATA MIGRATION ENDPOINT ====================

// Migrate data from KV store to new tables
app.post("/make-server-4452b5a8/migrate-to-tables", async (c) => {
  try {
    console.log('=== Starting data migration ===');
    
    // STEP 1: Migrate users from auth to profiles table
    console.log('\n--- Step 1: Migrating users to profiles table ---');
    
    const userResults = {
      migrated: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        userResults.errors.push('Failed to fetch auth users: ' + authError.message);
      } else {
        const authUsers = authUsersData?.users || [];
        console.log('Found', authUsers.length, 'users in auth');
        
        for (const authUser of authUsers) {
          try {
            console.log('Processing user:', authUser.email);
            
            // Check if user already exists in profiles
            const { data: existingProfile, error: checkError } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', authUser.email)
              .single();

            if (checkError && checkError.code !== 'PGRST116') {
              console.error('Error checking existing profile:', checkError);
              userResults.errors.push(`${authUser.email}: Check error - ${checkError.message}`);
              continue;
            }

            if (existingProfile) {
              console.log('✓ Profile already exists for:', authUser.email);
              userResults.skipped++;
              continue;
            }

            // Create profile
            console.log('Creating profile for:', authUser.email, 'with ID:', authUser.id);
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
                status: authUser.banned_until ? 'disabled' : 'active',
                created_at: authUser.created_at
              });

            if (insertError) {
              console.error('Error creating profile for', authUser.email, ':', insertError);
              userResults.errors.push(`${authUser.email}: ${insertError.message}`);
            } else {
              userResults.migrated++;
              console.log('✓ Created profile for:', authUser.email);
            }
          } catch (error) {
            console.error('Error processing user', authUser.email, ':', error);
            userResults.errors.push(`${authUser.email}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Exception in user migration:', error);
      userResults.errors.push('Exception: ' + error.message);
    }

    console.log('User migration results:', userResults);
    
    // STEP 2: Migrate items and claims from KV store
    console.log('\n--- Step 2: Migrating items and claims from KV store ---');
    const { data: kvData, error: kvError } = await supabase
      .from('kv_store_4452b5a8')
      .select('*');
    
    if (kvError) {
      console.error('Error fetching KV data:', kvError);
      return c.json({ 
        error: 'Failed to fetch KV data: ' + kvError.message,
        userResults 
      }, 500);
    }

    console.log('Found', kvData?.length || 0, 'records in KV store');

    const results = {
      users: userResults,
      reportedItems: { migrated: 0, errors: [] as string[] },
      lostItems: { migrated: 0, errors: [] as string[] },
      skipped: 0
    };

    // Separate items and claims
    const items = kvData?.filter(row => row.key.startsWith('item:')) || [];
    const claims = kvData?.filter(row => row.key.startsWith('claim:')) || [];

    console.log('Items to migrate:', items.length);
    console.log('Claims to migrate:', claims.length);

    // Migrate items to reporteditems table
    for (const row of items) {
      try {
        const itemData = JSON.parse(row.value);
        
        const { error } = await supabase
          .from('reporteditems')
          .insert({
            name: itemData.itemName,
            description: itemData.description || '',
            location: itemData.location,
            category: itemData.category,
            date: itemData.foundDate,
            status: itemData.status || 'pending',
            created_at: itemData.createdAt || new Date().toISOString()
          });

        if (error) {
          console.error('Error migrating item:', error);
          results.reportedItems.errors.push(`${itemData.itemName}: ${error.message}`);
        } else {
          results.reportedItems.migrated++;
          console.log('✓ Migrated item:', itemData.itemName);
        }
      } catch (error) {
        console.error('Error processing item:', error);
        results.reportedItems.errors.push(`Parse error: ${error.message}`);
      }
    }

    // Migrate claims to lostitems table
    for (const row of claims) {
      try {
        const claimData = JSON.parse(row.value);
        
        const { error } = await supabase
          .from('lostitems')
          .insert({
            name: claimData.claimerName || 'Unknown',
            description: claimData.description,
            location: '',
            category: '',
            date: new Date().toISOString().split('T')[0],
            status: claimData.status || 'pending',
            created_at: claimData.createdAt || new Date().toISOString()
          });

        if (error) {
          console.error('Error migrating claim:', error);
          results.lostItems.errors.push(`${claimData.claimerName}: ${error.message}`);
        } else {
          results.lostItems.migrated++;
          console.log('✓ Migrated claim:', claimData.claimerName);
        }
      } catch (error) {
        console.error('Error processing claim:', error);
        results.lostItems.errors.push(`Parse error: ${error.message}`);
      }
    }

    console.log('=== Migration complete ===');
    console.log('Results:', results);

    return c.json({
      message: 'Migration complete',
      results
    });
  } catch (error) {
    console.error('Error in migration:', error);
    return c.json({ error: 'Migration failed: ' + error.message }, 500);
  }
});

// ==================== USER MANAGEMENT ENDPOINTS ====================

// Manual sync endpoint - Force sync auth users to profiles table (admin only)
app.post("/make-server-4452b5a8/sync-profiles", async (c) => {
  console.log('========================================');
  console.log('[Manual Sync] FORCE SYNCING AUTH USERS TO PROFILES');
  console.log('========================================');
  
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (accessToken) {
      // Verify the requester is an admin
      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);
      
      if (authError || !user || user.user_metadata?.role !== 'admin') {
        console.log('[Manual Sync] Unauthorized access attempt');
        return c.json({ error: 'Admin access required' }, 403);
      }
    }

    // STEP 1: Clean up orphaned profiles (profiles without auth users)
    console.log('\n[Manual Sync] Step 1: Cleaning up orphaned profiles...');
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('[Manual Sync] ❌ Error fetching auth users:', authError);
      return c.json({ error: 'Failed to fetch auth users: ' + authError.message }, 500);
    }

    const authUsers = authUsersData?.users || [];
    const authUserIds = new Set(authUsers.map(u => u.id));
    
    console.log(`[Manual Sync] 📊 Found ${authUsers.length} users in auth.users`);

    // Get all profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email');

    if (profilesError) {
      console.error('[Manual Sync] ❌ Error fetching profiles:', profilesError);
      return c.json({ error: 'Failed to fetch profiles: ' + profilesError.message }, 500);
    }

    // Find orphaned profiles
    const orphanedProfiles = (allProfiles || []).filter(profile => !authUserIds.has(profile.id));
    
    if (orphanedProfiles.length > 0) {
      console.log(`[Manual Sync] 🧹 Found ${orphanedProfiles.length} orphaned profiles, cleaning up...`);
      
      for (const orphan of orphanedProfiles) {
        console.log(`[Manual Sync] Deleting orphaned profile: ${orphan.email} (ID: ${orphan.id})`);
        await supabase
          .from('profiles')
          .delete()
          .eq('id', orphan.id);
      }
      
      console.log(`[Manual Sync] ✅ Cleaned up ${orphanedProfiles.length} orphaned profiles`);
    } else {
      console.log('[Manual Sync] ✓ No orphaned profiles found');
    }
    
    // STEP 2: Sync auth users to profiles
    console.log('\n[Manual Sync] Step 2: Syncing auth users to profiles...');
    const results = {
      synced: 0,
      skipped: 0,
      cleaned: orphanedProfiles.length,
      errors: [] as string[]
    };

    for (const authUser of authUsers) {
      try {
        console.log(`\n[Manual Sync] Processing: ${authUser.email} (ID: ${authUser.id})`);
        
        // Check if profile already exists - don't use .single()
        const { data: existingProfiles, error: checkError } = await supabase
          .from('profiles')
          .select('id, email, status')
          .eq('id', authUser.id);

        if (checkError) {
          console.error(`[Manual Sync] ❌ Error checking profile:`, checkError);
          results.errors.push(`${authUser.email}: ${checkError.message}`);
          continue;
        }

        if (existingProfiles && existingProfiles.length > 0) {
          console.log(`[Manual Sync] ✓ Profile exists for ${authUser.email}`)
          results.skipped++;
          continue;
        }

        // Also check by email in case same email exists with different ID
        const { data: emailProfiles, error: emailCheckError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', authUser.email);

        if (!emailCheckError && emailProfiles && emailProfiles.length > 0) {
          // Email exists but with different ID - delete old profile first
          console.log(`[Manual Sync] 🔄 Email ${authUser.email} exists with different ID, cleaning up...`);
          await supabase
            .from('profiles')
            .delete()
            .eq('email', authUser.email);
        }

        // Create profile
        console.log(`[Manual Sync] 📝 Creating profile for ${authUser.email}...`);
        const profileData = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
          status: authUser.banned_until ? 'disabled' : 'active',
          type: authUser.user_metadata?.role || 'student',
          created_at: authUser.created_at
        };
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          console.error(`[Manual Sync] ❌ Insert error:`, insertError);
          results.errors.push(`${authUser.email}: ${insertError.message}`);
        } else {
          results.synced++;
          console.log(`[Manual Sync] ✅ Synced ${authUser.email}`);
        }
      } catch (error) {
        console.error(`[Manual Sync] ❌ Exception:`, error);
        results.errors.push(`${authUser.email}: ${error.message}`);
      }
    }

    console.log('\n========================================');
    console.log('[Manual Sync] SYNC COMPLETE');
    console.log(`[Manual Sync] ✅ Synced: ${results.synced}`);
    console.log(`[Manual Sync] ⏭️  Skipped: ${results.skipped}`);
    console.log(`[Manual Sync] 🧹 Cleaned: ${results.cleaned}`);
    console.log(`[Manual Sync] ❌ Errors: ${results.errors.length}`);
    console.log('========================================\n');

    return c.json({
      message: 'Profile sync complete',
      results: {
        total: authUsers.length,
        synced: results.synced,
        skipped: results.skipped,
        cleaned: results.cleaned,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('[Manual Sync] ❌ Fatal error:', error);
    return c.json({ error: 'Sync failed: ' + error.message }, 500);
  }
});

// List all users (admin only) - now using profiles table
app.get("/make-server-4452b5a8/users/list", async (c) => {
  console.log('========================');
  console.log('[Users List] ENDPOINT HIT - Request received');
  console.log('========================');
  
  try {
    console.log('[Users List] Fetching student users from profiles table...');

    // Simply query profiles table for students only (type = 'student')
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('type', 'student')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('[Users List] Error fetching profiles:', profilesError);
      return c.json({ error: 'Failed to fetch users: ' + profilesError.message }, 500);
    }
    
    console.log('[Users List] Found', profilesData?.length || 0, 'student users in profiles table');
    
    // Fetch auth users to get last sign in data
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('[Users List] Error fetching auth users:', authError);
      // Continue without last sign in data
    }
    
    console.log('[Users List] Found', authData?.users?.length || 0, 'auth users');
    
    // Create a map of auth user data by ID for quick lookup
    const authUserMap = new Map();
    if (authData?.users) {
      authData.users.forEach(authUser => {
        authUserMap.set(authUser.id, authUser);
      });
    }
    
    // Map profiles to user objects with last sign in data
    const users = (profilesData || []).map(profile => {
      const authUser = authUserMap.get(profile.id);
      return {
        id: profile.id,
        email: profile.email,
        name: profile.name || '',
        role: 'student',
        createdAt: profile.created_at,
        lastSignIn: authUser?.last_sign_in_at || null,
        disabled: profile.status === 'disabled',
      };
    });

    console.log('[Users List] Returning', users.length, 'student users');
    console.log('[Users List] Sample user with lastSignIn:', users[0]);
    
    return c.json({ users });
  } catch (error) {
    console.error('[Users List] Unhandled exception:', error);
    return c.json({ error: 'Internal server error: ' + (error?.message || 'Unknown error') }, 500);
  }
});

// Toggle user account status - disable/enable (admin only)
app.put("/make-server-4452b5a8/users/:id/toggle", async (c) => {
  try {
    const userId = c.req.param('id');

    console.log('[Toggle User] Toggling user:', userId);

    // Get the target user from profiles table
    const { data: targetProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (fetchError || !targetProfile) {
      console.error('[Toggle User] User not found in profiles:', fetchError);
      return c.json({ error: 'User not found' }, 404);
    }

    console.log('[Toggle User] Current status:', targetProfile.status);

    // Toggle status between 'active' and 'disabled'
    const newStatus = targetProfile.status === 'disabled' ? 'active' : 'disabled';

    // Update in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (updateError) {
      console.error('[Toggle User] Update failed:', updateError);
      return c.json({ error: 'Failed to update user: ' + updateError.message }, 500);
    }

    // IMPORTANT: Also ban/unban in Supabase Auth so they can't login
    if (newStatus === 'disabled') {
      // Ban the user - they won't be able to login
      const banDuration = '876000h'; // 100 years (essentially permanent)
      const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: banDuration
      });
      
      if (banError) {
        console.error('[Toggle User] Failed to ban user in auth:', banError);
        // Continue anyway since profile was updated
      } else {
        console.log('[Toggle User] User banned in auth');
      }
    } else {
      // Unban the user - remove the ban
      const { error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: 'none'
      });
      
      if (unbanError) {
        console.error('[Toggle User] Failed to unban user in auth:', unbanError);
        // Continue anyway since profile was updated
      } else {
        console.log('[Toggle User] User unbanned in auth');
      }
    }

    const message = newStatus === 'disabled' ? 'User disabled successfully' : 'User enabled successfully';
    console.log('[Toggle User]', message);

    return c.json({ 
      message,
      disabled: newStatus === 'disabled'
    });
  } catch (error) {
    console.error('[Toggle User] Exception:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Delete user account permanently (admin only)
app.delete("/make-server-4452b5a8/users/:id", async (c) => {
  try {
    const userId = c.req.param('id');

    console.log('[Delete User] Deleting user:', userId);

    // Try to delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      // If user doesn't exist in auth, that's OK - they might be an orphaned profile
      if (authError.message.includes('User not found') || authError.message.includes('not found')) {
        console.log('[Delete User] User not found in auth (orphaned profile), proceeding to delete profile only');
      } else {
        // Other errors are more serious
        console.error('[Delete User] Failed to delete from auth:', authError);
        return c.json({ error: 'Failed to delete user from auth: ' + authError.message }, 500);
      }
    } else {
      console.log('[Delete User] User deleted from auth successfully');
    }

    // Delete from profiles table (whether auth deletion succeeded or not)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('[Delete User] Failed to delete from profiles:', profileError);
      return c.json({ error: 'Failed to delete profile: ' + profileError.message }, 500);
    }

    console.log('[Delete User] User deleted completely');
    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Delete User] Exception:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// ==================== DEMO ACCOUNT MANAGEMENT ====================

// Reset admin account specifically
app.post("/make-server-4452b5a8/reset-admin", async (c) => {
  try {
    console.log('========================================');
    console.log('[Reset Admin] RESETTING ADMIN ACCOUNT');
    console.log('========================================');
    
    const ADMIN_EMAIL = 'admin@school.edu';
    const ADMIN_PASSWORD = 'password123';
    
    // Get all existing users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    
    // Find and delete any existing admin account
    const existingAdmin = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);
    if (existingAdmin) {
      console.log('[Reset Admin] Found existing admin account, deleting...', existingAdmin.id);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingAdmin.id);
      if (deleteError) {
        console.error('[Reset Admin] Error deleting existing admin:', deleteError);
      } else {
        console.log('[Reset Admin] ✓ Deleted existing admin account');
      }
      
      // Wait a moment for deletion to process
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('[Reset Admin] No existing admin account found');
    }

    // Create fresh admin account
    console.log('[Reset Admin] Creating new admin account...');
    console.log('[Reset Admin] Email:', ADMIN_EMAIL);
    console.log('[Reset Admin] Password:', ADMIN_PASSWORD);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      user_metadata: { role: 'admin' },
      email_confirm: true,
    });

    if (error) {
      console.error('[Reset Admin] ❌ Failed to create admin account:', error);
      return c.json({ 
        success: false,
        error: error.message,
        details: error 
      }, 500);
    }
    
    console.log('[Reset Admin] ✅ Admin account created successfully!');
    console.log('[Reset Admin] User ID:', data.user?.id);
    console.log('[Reset Admin] Email:', data.user?.email);
    console.log('========================================');

    return c.json({
      success: true,
      message: 'Admin account reset successfully',
      credentials: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      },
      userId: data.user?.id
    });
  } catch (error) {
    console.error('[Reset Admin] ❌ Exception:', error);
    return c.json({ 
      success: false,
      error: 'Internal server error: ' + error.message 
    }, 500);
  }
});

// Reset and recreate all demo accounts (troubleshooting endpoint)
app.post("/make-server-4452b5a8/reset-demo-accounts", async (c) => {
  try {
    const DEMO_ACCOUNTS = [
      // Admin account
      { email: 'admin@school.edu', password: 'password123', role: 'admin' },
    ];

    console.log('Starting demo account reset...');

    // Get all existing users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    
    // Delete all demo accounts
    for (const account of DEMO_ACCOUNTS) {
      const existingUser = existingUsers?.users?.find(u => u.email === account.email);
      if (existingUser) {
        console.log(`Deleting existing account: ${account.email}`);
        await supabase.auth.admin.deleteUser(existingUser.id);
      }
    }

    // Wait a bit for deletions to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Recreate all accounts
    const results = {
      created: [] as string[],
      errors: [] as string[],
    };

    for (const account of DEMO_ACCOUNTS) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          user_metadata: { role: account.role },
          email_confirm: true,
        });

        if (error) {
          console.error(`Failed to create ${account.email}:`, error);
          results.errors.push(`${account.email}: ${error.message}`);
        } else {
          results.created.push(account.email);
          console.log(`Created account: ${account.email}`);
        }
      } catch (error) {
        console.error(`Error creating ${account.email}:`, error);
        results.errors.push(`${account.email}: ${error.message}`);
      }
    }

    return c.json({
      message: 'Demo accounts reset complete',
      results,
    });
  } catch (error) {
    console.error('Error in /reset-demo-accounts endpoint:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

// Get statistics for home page
app.get("/make-server-4452b5a8/stats", async (c) => {
  try {
    console.log('[Stats] Fetching statistics...');
    
    // Get all items from reporteditems table
    const { data: itemsData, error: itemsError } = await supabase
      .from('reporteditems')
      .select('status');
    
    if (itemsError) {
      console.error('[Stats] Error fetching items:', itemsError);
      return c.json({ error: 'Failed to fetch items: ' + itemsError.message }, 500);
    }
    
    // Get all claims from lostitems table
    const { data: claimsData, error: claimsError } = await supabase
      .from('lostitems')
      .select('status')
      .eq('category', 'CLAIM');
    
    if (claimsError) {
      console.error('[Stats] Error fetching claims:', claimsError);
      return c.json({ error: 'Failed to fetch claims: ' + claimsError.message }, 500);
    }
    
    // Calculate statistics
    const totalItems = itemsData?.length || 0;
    const claimedItems = itemsData?.filter(item => item.status === 'claimed').length || 0;
    const pendingClaims = claimsData?.filter(claim => claim.status === 'pending').length || 0;
    
    // Calculate success rate
    const successRate = totalItems > 0 ? Math.round((claimedItems / totalItems) * 100) : 0;
    
    console.log('[Stats] Total items:', totalItems);
    console.log('[Stats] Claimed items:', claimedItems);
    console.log('[Stats] Pending claims:', pendingClaims);
    console.log('[Stats] Success rate:', successRate + '%');
    
    return c.json({
      totalItems,
      claimedItems,
      pendingClaims,
      successRate
    });
  } catch (error) {
    console.error('[Stats] Error:', error);
    return c.json({ error: 'Internal server error: ' + error.message }, 500);
  }
});

Deno.serve(app.fetch);