import type { NextConfig } from "next";
import { withWorkflow } from "@workflow/next";

const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"accelerometer=(), camera=(), gyroscope=(), magnetometer=(), microphone=(), geolocation=(), payment=(), usb=()"},
  {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
  {key:"Cross-Origin-Resource-Policy",value:"same-origin"},
  {key:"Origin-Agent-Cluster",value:"?1"},
  {key:"X-DNS-Prefetch-Control",value:"off"},
  {key:"X-Permitted-Cross-Domain-Policies",value:"none"},
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
    "connect-src 'self' https://openrouter.ai https://*.vercel-insights.com https://tiles.openfreemap.org",
    "worker-src 'self' blob:",
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
