package com.journeygo.modules.media.dto;

public record CloudinaryUploadSignatureResponse(String cloudName, String apiKey, String folder,
                                                String publicId, long timestamp,
                                                String allowedFormats, String signature,
                                                String uploadUrl) {}
