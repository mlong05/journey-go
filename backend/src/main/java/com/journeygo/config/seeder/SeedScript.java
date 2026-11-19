package com.journeygo.config.seeder;

/**
 * Mô tả một file SQL seed nằm trong {@code classpath:seed/}.
 *
 * @param filename tên file (dùng để log & sắp xếp thứ tự)
 * @param order    số thứ tự (tiền tố số trước dấu {@code _})
 * @param resource resource tương ứng trong classpath
 */
public record SeedScript(String filename, int order, org.springframework.core.io.Resource resource) {
}
