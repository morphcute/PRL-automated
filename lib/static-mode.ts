export const isStaticExportBuild =
  process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ||
  process.env.STATIC_EXPORT === "true";
