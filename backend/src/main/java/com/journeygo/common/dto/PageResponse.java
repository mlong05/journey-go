package com.journeygo.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Dữ liệu phản hồi phân trang và sắp xếp")
public class PageResponse<T> {

    @Schema(description = "Trang hiện tại (bắt đầu từ 0)", example = "0")
    private int page;

    @Schema(description = "Số lượng phần tử trên mỗi trang", example = "10")
    private int size;

    @Schema(description = "Tổng số phần tử", example = "50")
    private long totalElements;

    @Schema(description = "Tổng số trang", example = "5")
    private int totalPages;

    @Schema(description = "Có phải trang đầu tiên không", example = "true")
    private boolean first;

    @Schema(description = "Có phải trang cuối cùng không", example = "false")
    private boolean last;

    @Schema(description = "Danh sách dữ liệu")
    private List<T> content;

    public static <T> PageResponse<T> from(Page<T> page) {
        return PageResponse.<T>builder()
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .content(page.getContent())
                .build();
    }

    public static <E, D> PageResponse<D> from(Page<E> page, Function<E, D> mapper) {
        List<D> mappedContent = page.getContent().stream().map(mapper).toList();
        return PageResponse.<D>builder()
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .content(mappedContent)
                .build();
    }
}
