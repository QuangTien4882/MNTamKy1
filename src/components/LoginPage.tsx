import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

const EMAIL_STORAGE_KEY = 'remembered_login_email';

const rememberEmail = (value: string) => {
    try {
        localStorage.setItem(EMAIL_STORAGE_KEY, value);
    } catch (e) {
        // ignore storage errors
    }
};

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getFriendlyAuthError = (message: string): string => {
    const m = (message || '').toLowerCase();
    if (m.includes('email_confirmation_required')) {
        return 'Đăng ký thành công. Tuy nhiên hệ thống đang yêu cầu xác nhận email. Quản trị viên cần tắt xác nhận email trong Supabase (Authentication → Email → Confirm email) để đăng nhập chỉ phụ thuộc sự duyệt của Admin.';
    }
    if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
        return 'Email hoặc mật khẩu không chính xác.';
    }
    if (m.includes('email not confirmed')) {
        return 'Tài khoản chưa được duyệt hoặc email chưa được xác nhận. Vui lòng đợi Admin duyệt (và đảm bảo xác nhận email đã được tắt).';
    }
    if (m.includes('user already registered') || m.includes('already been registered')) {
        return 'Email này đã được đăng ký.';
    }
    if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes') || m.includes('only request this after')) {
        const seconds = (message.match(/after\s+(\d+)\s+seconds?/i) || [])[1];
        const waitHint = seconds ? ` Hệ thống yêu cầu chờ khoảng ${seconds} giây.` : ' Song, hãy xem nguyên nhân dưới đây vì giới hạn có thể là theo giờ, không phải vài phút.';
        return (
            'Đăng ký tạm bị giới hạn tần suất.' + waitHint +
            ' Nguyên nhân thường gặp nhất: Supabase đang bật "Confirm email" — mỗi lần đăng ký gửi 1 email xác nhận và bản SMTP mặc định chỉ cho 2 email/giờ cho toàn project, nên email mới cũng bị chặn. ' +
            'Hãy tắt "Confirm email" trong Supabase (Authentication → Providers → Email → bỏ chọn Confirm email), hoặc chờ khoảng 1 giờ rồi thử lại.'
        );
    }
    return 'Đã xảy ra lỗi: ' + message;
};

const LoginPage: React.FC = () => {
    const { signInWithEmail, signUp, approvalPending } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');

    // Login fields
    const [email, setEmail] = useState(() => {
        try {
            return localStorage.getItem(EMAIL_STORAGE_KEY) || '';
        } catch (e) {
            return '';
        }
    });
    const [password, setPassword] = useState('');

    // Register fields
    const [regDisplayName, setRegDisplayName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [regSuccess, setRegSuccess] = useState('');

    const switchMode = (m: 'login' | 'register') => {
        setMode(m);
        setError('');
        setRegSuccess('');
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await signInWithEmail(email, password);
        } catch (err: any) {
            setError(err?.message ? getFriendlyAuthError(err.message) : 'Đã xảy ra lỗi khi đăng nhập.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setRegSuccess('');
        if (regPassword.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }
        if (regPassword !== regConfirm) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        setIsLoading(true);
        try {
            await signUp(regEmail, regPassword, regDisplayName);
            rememberEmail(regEmail);
            setEmail(regEmail);
            setRegSuccess('Đăng ký thành công. Tài khoản của bạn đang chờ Admin duyệt. Vui lòng quay lại sau.');
            setMode('register');
            setRegDisplayName('');
            setRegEmail('');
            setRegPassword('');
            setRegConfirm('');
        } catch (err: any) {
            setError(err?.message ? getFriendlyAuthError(err.message) : 'Đã xảy ra lỗi khi đăng ký.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                 <div className="flex justify-center">
                    <div className="w-14 h-14 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21.8,4.27A2,2,0,0,0,20,3H4A2,2,0,0,0,2.2,4.27l2.85,9.26a2,2,0,0,0,2,1.47H17a2,2,0,0,0,2-1.47Z" />
                            <path d="M5,17H19a1,1,0,0,1,0,2H5a1,1,0,0,1,0-2Z" />
                            <path d="M12 1a3.89 3.89 0 00-4 .78 1 1 0 101.41 1.42A1.9 1.9 0 0112 2a1.89 1.89 0 012.55.79 1 1 0 001.41-1.42A3.88 3.88 0 0012 1zM8 1a3.89 3.89 0 00-4 .78 1 1 0 101.41 1.42A1.9 1.9 0 018 2a1.89 1.89 0 012.55.79 1 1 0 001.41-1.42A3.88 3.88 0 008 1zM16 1a3.89 3.89 0 00-4 .78 1 1 0 101.41 1.42A1.9 1.9 0 0116 2a1.89 1.89 0 012.55.79 1 1 0 001.41-1.42A3.88 3.88 0 0016 1z" />
                        </svg>
                    </div>
                </div>
                <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                    Trường Mầm non Tam Kỳ 1
                </h2>
                 <p className="mt-2 text-center text-lg text-gray-600 dark:text-gray-400">
                    Hệ thống đăng ký suất ăn
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
                    <div className="flex rounded-md overflow-hidden border dark:border-gray-600 mb-6">
                        <button type="button" onClick={() => switchMode('login')} className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>Đăng nhập</button>
                        <button type="button" onClick={() => switchMode('register')} className={`flex-1 py-2 text-sm font-medium ${mode === 'register' ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>Đăng ký</button>
                    </div>

                    {approvalPending && !regSuccess && (
                        <div role="alert" className="text-amber-700 dark:text-amber-300 text-sm p-3 bg-amber-50 dark:bg-amber-900/50 rounded-md mb-4">
                            Tài khoản của bạn đang chờ Admin duyệt. Bạn chưa thể đăng nhập cho đến khi được duyệt.
                        </div>
                    )}

                    {regSuccess && (
                        <div role="alert" className="text-green-700 dark:text-green-300 text-sm p-3 bg-green-50 dark:bg-green-900/50 rounded-md mb-4">
                            {regSuccess}
                        </div>
                    )}

                    {mode === 'login' ? (
                        <form className="space-y-6" onSubmit={handleLogin}>
                            <Input label="Địa chỉ email" id="email" type="email" autoComplete="email" value={email} onChange={(v) => { setEmail(v); rememberEmail(v); }} />
                            <Input label="Mật khẩu" id="password" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
                            {error && <ErrorBox message={error} />}
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-400 dark:disabled:bg-teal-800 disabled:cursor-wait">
                                {isLoading ? <LoadingSpinner /> : 'Đăng nhập'}
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleRegister}>
                            <Input label="Họ và tên" id="regDisplayName" type="text" autoComplete="name" value={regDisplayName} onChange={setRegDisplayName} />
                            <Input label="Địa chỉ email" id="regEmail" type="email" autoComplete="email" value={regEmail} onChange={setRegEmail} />
                            <Input label="Mật khẩu" id="regPassword" type="password" autoComplete="new-password" value={regPassword} onChange={setRegPassword} />
                            <Input label="Xác nhận mật khẩu" id="regConfirm" type="password" autoComplete="new-password" value={regConfirm} onChange={setRegConfirm} />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Sau khi đăng ký, tài khoản sẽ được Admin duyệt trước khi bạn có thể sử dụng hệ thống.</p>
                            {error && <ErrorBox message={error} />}
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-teal-400 dark:disabled:bg-teal-800 disabled:cursor-wait">
                                {isLoading ? <LoadingSpinner /> : 'Đăng ký'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const Input: React.FC<{
    label: string;
    id: string;
    type: string;
    autoComplete: string;
    value: string;
    onChange: (v: string) => void;
}> = ({ label, id, type, autoComplete, value, onChange }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1">
            <input
                id={id}
                type={type}
                autoComplete={autoComplete}
                required
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
            />
        </div>
    </div>
);

const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
    <div role="alert" aria-live="assertive" className="text-red-600 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/50 rounded-md">
        {message}
    </div>
);

export default LoginPage;
