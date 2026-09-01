// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // 1. Define paths that should be PUBLIC
    const isPublicPath =
        pathname === '/' ||
        pathname === '/sitemap.xml' ||
        pathname === '/robots.txt' ||
        pathname.startsWith('/_next') ||
        pathname.includes('.');

    // 2. If it's a public path, let it through
    if (isPublicPath) {
        return NextResponse.next();
    }

    // 3. CHECK AUTH (Check for your specific cookie name)
    // Common names: 'next-auth.session-token' or '__Secure-next-auth.session-token'
    const token = request.cookies.get('session');

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};