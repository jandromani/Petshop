import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=()"},
  {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
  {key:"Content-Security-Policy",value:[
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://openrouter.ai https://*.vercel-insights.com",
  ].join("; ")},
];

const nextConfig:NextConfig={
  reactStrictMode:true,
  poweredByHeader:false,
  async headers(){
    return[{source:"/:path*",headers:securityHeaders}];
  },
};

export default withWorkflow(nextConfig);
