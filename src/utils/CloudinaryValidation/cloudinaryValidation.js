// Helper functions

const allowedResourceTypes = ["image", "video", "raw"];

const isValidAttachment = (a) => a && typeof a.url === "string" && a.url.trim() && typeof a.cloudinaryId === "string" && a.cloudinaryId.trim() && typeof a.resourceType === "string" && allowedResourceTypes.includes(a.resourceType);

// Single item

export const validateFileResourceType = (type) => ["image", "video", "raw"].includes(type);

// Multiple items

export const validateAttachments = (arr) => Array.isArray(arr) && arr.every(isValidAttachment);