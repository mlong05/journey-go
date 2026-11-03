package com.journeygo.modules.geo.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.geo.dto.GeoAddress;
import com.journeygo.modules.geo.dto.GeoRoute;
import com.journeygo.modules.geo.dto.GeoSuggestion;
import com.journeygo.modules.geo.service.GoongGeoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/geo")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'MODERATOR')")
@Tag(name = "Bản đồ (Goong)", description = "Tra cứu địa chỉ khi khai báo điểm đến và chỉ đường cho du khách")
public class GeoController {

    private final GoongGeoService geoService;

    @GetMapping("/autocomplete")
    @Operation(summary = "Gợi ý địa chỉ khi gõ (đơn vị hành chính mới)")
    public ResponseEntity<ApiResponse<List<GeoSuggestion>>> autocomplete(
            @Parameter(description = "Từ khóa, tối thiểu 2 ký tự") @RequestParam String text,
            @Parameter(description = "Ưu tiên gần vị trí \"lat,lng\"") @RequestParam(required = false) String focus
    ) {
        return ResponseEntity.ok(ApiResponse.success(geoService.autocomplete(text, focus)));
    }

    @GetMapping("/place")
    @Operation(summary = "Chi tiết và tọa độ của một gợi ý")
    public ResponseEntity<ApiResponse<GeoAddress>> place(@RequestParam String refId) {
        return ResponseEntity.ok(ApiResponse.success(geoService.place(refId)));
    }

    @GetMapping("/reverse")
    @PreAuthorize("hasAnyRole('TOURIST', 'USER', 'ADMIN', 'PROVIDER', 'MODERATOR')")
    @Operation(summary = "Địa chỉ tại một tọa độ (bấm/kéo ghim trên bản đồ; du khách dùng để biết đang ở tỉnh/thành nào)")
    public ResponseEntity<ApiResponse<GeoAddress>> reverse(@RequestParam double lat, @RequestParam double lng) {
        return ResponseEntity.ok(ApiResponse.success(geoService.reverse(lat, lng)));
    }

    @GetMapping("/direction")
    @PreAuthorize("hasAnyRole('TOURIST', 'USER', 'ADMIN', 'PROVIDER', 'MODERATOR')")
    @Operation(summary = "Đường đi và các bước chỉ đường giữa hai tọa độ (du khách tới điểm đến)")
    public ResponseEntity<ApiResponse<GeoRoute>> direction(
            @RequestParam double fromLat,
            @RequestParam double fromLng,
            @RequestParam double toLat,
            @RequestParam double toLng,
            @Parameter(description = "walk | car | bike | taxi | truck | hd, mặc định bike (walk: tuyến xe 2 bánh, thời gian theo tốc độ đi bộ)")
            @RequestParam(required = false) String vehicle
    ) {
        return ResponseEntity.ok(ApiResponse.success(geoService.direction(fromLat, fromLng, toLat, toLng, vehicle)));
    }
}
