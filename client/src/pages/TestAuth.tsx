import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function TestAuth() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      // Test 1: Check if Supabase client is configured
      const url = supabase.supabaseUrl;
      const key = supabase.supabaseKey;
      
      setResult(`✅ Supabase URL: ${url}\n✅ Key configured: ${Boolean(key)}\n\nTesting connection...`);
      
      // Test 2: Try to get session (should work even if not logged in)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        setResult(prev => prev + `\n❌ Session error: ${sessionError.message}`);
      } else {
        setResult(prev => prev + `\n✅ Session check successful\n✅ Logged in: ${Boolean(sessionData.session)}`);
      }
      
      // Test 3: Try a simple query (will fail if not logged in, which is fine)
      const { error: queryError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (queryError) {
        setResult(prev => prev + `\n⚠️  Query test: ${queryError.message}`);
      } else {
        setResult(prev => prev + `\n✅ Database query successful`);
      }
      
    } catch (err: unknown) {
      setResult(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-2xl p-8">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
        
        <Button onClick={testConnection} disabled={loading} className="mb-4">
          {loading ? "Testing..." : "Run Connection Test"}
        </Button>
        
        {result && (
          <pre className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap font-mono">
            {result}
          </pre>
        )}
        
        <div className="mt-6 text-sm text-muted-foreground">
          <p>This page tests your Supabase connection without requiring login.</p>
          <p className="mt-2">Go back to <a href="/login" className="text-primary hover:underline">Login</a></p>
        </div>
      </Card>
    </div>
  );
}
