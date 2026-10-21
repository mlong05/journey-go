package com.journeygo.modules.journey.provider;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MockTourInfoProvider implements TourInfoProvider {

    private final DestinationRepository destinationRepository;

    @Override
    public TourInfo getTourInfo(Long tourId) {
        List<Destination> destinations = destinationRepository.findByDeletedFalse();

        if (destinations.isEmpty()) {
            // Trường hợp DB chưa có điểm đến, trả về dữ liệu mẫu chuẩn theo tài liệu (Huế Thân Thương)
            return buildFallbackHueTour(tourId);
        }

        // Tạo hành trình mẫu từ các điểm đến thực tế có trong DB
        List<TourInfo.TourDestinationInfo> destInfos = new ArrayList<>();
        int order = 1;
        for (Destination d : destinations) {
            if (order > 3) break; // Lấy tối đa 3 điểm cho 1 tour mẫu

            List<TourInfo.TourTaskInfo> tasks = List.of(
                    new TourInfo.TourTaskInfo(
                            (long) (d.getId() * 10 + 1),
                            "Tìm hiểu lịch sử " + d.getName(),
                            "QUIZ",
                            1,
                            10,
                            "A"
                    ),
                    new TourInfo.TourTaskInfo(
                            (long) (d.getId() * 10 + 2),
                            "Khám phá mật mã cổ tại " + d.getName(),
                            "REAL_WORLD_INTERACTIVE",
                            2,
                            20,
                            "DI SAN VIET NAM",
                            "Hãy tìm bảng chữ in nổi xung quanh nơi bạn đang đứng tại " + d.getName() + ", sau đó giải mã theo dãy số để tìm ra thông điệp ẩn giấu.",
                            d.getLatitude(),
                            d.getLongitude(),
                            60,
                            "Gợi ý: Cụm từ gồm 4 chữ, tôn vinh giá trị văn hóa nước nhà."
                    )
            );

            destInfos.add(new TourInfo.TourDestinationInfo(
                    d.getId(),
                    d.getName(),
                    order++,
                    d.getId(),
                    d.getLatitude(),
                    d.getLongitude(),
                    100, // bán kính 100 mét
                    "QR_" + d.getId() + "_TOKEN",
                    tasks
            ));
        }

        String tourTitle = "Hành trình di sản văn hóa trọng điểm #" + tourId;
        return new TourInfo(tourId, tourTitle, destInfos);
    }

    private TourInfo buildFallbackHueTour(Long tourId) {
        List<TourInfo.TourDestinationInfo> destInfos = List.of(
                new TourInfo.TourDestinationInfo(
                        101L,
                        "Chùa Thiên Mụ",
                        1,
                        201L,
                        new BigDecimal("16.4526000"),
                        new BigDecimal("107.5458000"),
                        80,
                        "QR_THIEN_MU",
                        List.of(
                                new TourInfo.TourTaskInfo(1001L, "Lịch sử tháp Phước Duyên", "QUIZ", 1, 10, "B"),
                                new TourInfo.TourTaskInfo(
                                        1002L,
                                        "Mật mã chuông đồng Chùa Thiên Mụ",
                                        "REAL_WORLD_INTERACTIVE",
                                        2,
                                        20,
                                        "PHUOC DUYEN",
                                        "Hãy quan sát văn bia bên cạnh tháp chính và tìm tên ngọn tháp 7 tầng nổi tiếng của chùa.",
                                        new BigDecimal("16.4526000"),
                                        new BigDecimal("107.5458000"),
                                        50,
                                        "Gợi ý: Tên tháp có chữ Phước..."
                                )
                        )
                ),
                new TourInfo.TourDestinationInfo(
                        102L,
                        "Lăng Tự Đức",
                        2,
                        202L,
                        new BigDecimal("16.4332000"),
                        new BigDecimal("107.5658000"),
                        100,
                        "QR_LANG_TU_DUC",
                        List.of(
                                new TourInfo.TourTaskInfo(1003L, "Kiến trúc Khiêm Cung", "QUIZ", 1, 10, "C"),
                                new TourInfo.TourTaskInfo(
                                        1004L,
                                        "Thông điệp bia Khiêm Ký",
                                        "REAL_WORLD_INTERACTIVE",
                                        2,
                                        20,
                                        "KHIEM KHI",
                                        "Tìm tấm bia đá lớn nhất Việt Nam tại Bi Đình và nhập tên bài tự ký của vua Tự Đức.",
                                        new BigDecimal("16.4332000"),
                                        new BigDecimal("107.5658000"),
                                        50,
                                        "Gợi ý: Bài văn bia có chữ Khiêm..."
                                )
                        )
                ),
                new TourInfo.TourDestinationInfo(
                        103L,
                        "Kinh thành Huế",
                        3,
                        203L,
                        new BigDecimal("16.4699000"),
                        new BigDecimal("107.5786000"),
                        120,
                        "QR_KINH_THANH",
                        List.of(
                                new TourInfo.TourTaskInfo(1005L, "Biểu tượng Ngọ Môn", "QUIZ", 1, 10, "A"),
                                new TourInfo.TourTaskInfo(
                                        1006L,
                                        "Báu vật Cửu Đỉnh triều Nguyễn",
                                        "REAL_WORLD_INTERACTIVE",
                                        2,
                                        20,
                                        "CUU DINH",
                                        "Đến trước Thế Miếu, đếm số đỉnh đồng lớn tượng trưng cho quyền lực triều Nguyễn.",
                                        new BigDecimal("16.4699000"),
                                        new BigDecimal("107.5786000"),
                                        60,
                                        "Gợi ý: 9 chiếc đỉnh bằng đồng được gọi là gì?"
                                )
                        )
                )
        );

        return new TourInfo(tourId, "Huế Thân Thương với dòng sông Hương", destInfos);
    }
}
