import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { userAPI } from '../../lib/api';

const StorageTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    }]);
  };

  const runStorageTests = async () => {
    setTesting(true);
    setTestResults([]);

    try {
      // Test 1: Check authentication
      addResult('Authentication', true, 'Starting storage tests...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        addResult('Authentication', false, 'User not authenticated', authError);
        return;
      }
      addResult('Authentication', true, `User authenticated: ${user.id}`);

      // Test 2: Check if avatars bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        addResult('Bucket Check', false, 'Failed to list buckets', bucketsError);
        return;
      }
      
      const avatarsBucket = buckets.find(bucket => bucket.id === 'avatars');
      if (!avatarsBucket) {
        addResult('Bucket Check', false, 'Avatars bucket does not exist');
        return;
      }
      addResult('Bucket Check', true, 'Avatars bucket exists', avatarsBucket);

      // Test 3: Test file upload permissions
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const testPath = `${user.id}/test-${Date.now()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(testPath, testFile);

      if (uploadError) {
        addResult('Upload Test', false, 'Upload failed', uploadError);
      } else {
        addResult('Upload Test', true, 'Upload successful', uploadData);
        
        // Test 4: Test file deletion
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([testPath]);
          
        if (deleteError) {
          addResult('Delete Test', false, 'Delete failed', deleteError);
        } else {
          addResult('Delete Test', true, 'Delete successful');
        }
      }

      // Test 5: Test public URL generation
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl('test-path.jpg');
        
      if (urlData.publicUrl) {
        addResult('Public URL Test', true, 'Public URL generated', urlData);
      } else {
        addResult('Public URL Test', false, 'Failed to generate public URL');
      }

      // Test 6: Test profile API
      try {
        const profile = await userAPI.getProfile();
        addResult('Profile API', true, 'Profile loaded successfully', { 
          user_type: profile.user_type,
          has_avatar: !!profile.avatar_url 
        });
      } catch (profileError) {
        addResult('Profile API', false, 'Profile API failed', profileError);
      }

    } catch (error) {
      addResult('General Error', false, 'Unexpected error occurred', error);
    } finally {
      setTesting(false);
    }
  };

  const testImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setTesting(true);
      addResult('Image Upload', true, `Testing upload of ${file.name} (${file.size} bytes)`);

      try {
        const avatarUrl = await userAPI.uploadAvatar(file);
        addResult('Image Upload', true, 'Image uploaded successfully', { avatarUrl });
      } catch (error) {
        addResult('Image Upload', false, 'Image upload failed', error);
      } finally {
        setTesting(false);
      }
    };

    input.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg p-6 border border-secondary-200">
        <h2 className="text-xl font-bold text-secondary-900 mb-4">Storage Debug Tool</h2>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={runStorageTests}
            disabled={testing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {testing ? 'Running Tests...' : 'Run Storage Tests'}
          </button>
          
          <button
            onClick={testImageUpload}
            disabled={testing}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            Test Image Upload
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">Test Results:</h3>
          
          {testResults.length === 0 ? (
            <p className="text-secondary-500">No tests run yet. Click "Run Storage Tests" to begin.</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {result.success ? '✅' : '❌'} {result.test}
                    </span>
                    <span className="text-xs opacity-75">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{result.message}</p>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer">Show Details</summary>
                      <pre className="text-xs mt-1 p-2 bg-black bg-opacity-10 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorageTest;
