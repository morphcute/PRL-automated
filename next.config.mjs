/** @type {import('next').NextConfig} */
const isStaticExport =
  process.env.STATIC_EXPORT === "true" ||
  process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

const nextConfig = isStaticExport
  ? {
      output: "export",
      images: {
        unoptimized: true,
      },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
