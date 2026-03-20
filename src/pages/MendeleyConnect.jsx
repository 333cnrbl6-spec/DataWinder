import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function MendeleyConnect() {
    const navigate = useNavigate();
    const [status, setStatus] = useState('exchanging');
    const [error, setError] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (!code) {
            setStatus('error');
            setError('No authorization code received from Mendeley.');
            return;
        }

        base44.functions.invoke('mendeleyAuth', { action: 'exchange_code', code })
            .then(res => {
                const { access_token, refresh_token, expires_in } = res.data;
                if (!access_token) {
                    setStatus('error');
                    setError('Failed to obtain access token.');
                    return;
                }
                const expiry = Date.now() + (expires_in * 1000);
                localStorage.setItem('mendeley_access_token', access_token);
                localStorage.setItem('mendeley_refresh_token', refresh_token || '');
                localStorage.setItem('mendeley_token_expiry', expiry.toString());
                setStatus('success');
                setTimeout(() => navigate('/LiteratureLibrary'), 1500);
            })
            .catch(err => {
                setStatus('error');
                setError(err.message);
            });
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-4 max-w-sm w-full">
                {status === 'exchanging' && (
                    <>
                        <Loader2 className="w-10 h-10 text-bangor-red animate-spin" />
                        <p className="text-slate-600 font-medium">Connecting to Mendeley…</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                        <p className="text-slate-700 font-semibold">Connected! Redirecting…</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="w-10 h-10 text-red-500" />
                        <p className="text-slate-700 font-semibold">Connection failed</p>
                        <p className="text-slate-500 text-sm text-center">{error}</p>
                        <button onClick={() => navigate('/LiteratureLibrary')} className="mt-2 text-bangor-red underline text-sm">Go back</button>
                    </>
                )}
            </div>
        </div>
    );
}