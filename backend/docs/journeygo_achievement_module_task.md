# JourneyGo -- Achievement Module (Task Specification)

> **Mục tiêu:** Xây dựng module `achievement` cho JourneyGo theo cơ chế
> thành tựu/huy hiệu kiểu game. Tài liệu này là đầu vào để AI Agent
> trong Antigravity khảo sát repository hiện tại, đề xuất cách tích hợp
> và triển khai theo đúng kiến trúc đang có.

## 1. Thứ tự triển khai bắt buộc

Triển khai theo thứ tự sau, không làm đảo thứ tự:

1.  **Tourist API trước:** hoàn thiện các API phục vụ người dùng du lịch
    (Tourist) xem thành tựu, theo dõi tiến độ và nhận thưởng.
2.  **Admin API sau:** chỉ triển khai CRUD quản trị danh mục thành tựu
    sau khi Tourist API đã hoàn thành và kiểm thử ổn định.

### Làm rõ phạm vi CRUD

-   Tourist **không được tạo, sửa hoặc xóa định nghĩa thành tựu**. Đây
    là dữ liệu cấu hình do hệ thống/Admin quản lý.
-   Với Tourist, phạm vi API là các thao tác người dùng: xem danh sách,
    xem chi tiết, xem tiến độ/trạng thái và nhận thưởng thành tựu đã
    đạt.
-   Admin mới có quyền CRUD định nghĩa thành tựu: tạo, xem, cập nhật,
    xóa/vô hiệu hóa thành tựu.
-   Không triển khai Admin API trước hoặc gộp lẫn vào giai đoạn Tourist
    API.

## 2. Yêu cầu làm việc với repository

Trước khi code, Agent cần:

1.  Đọc cấu trúc repository và xác định backend framework, quy ước
    module, naming convention, response format, exception handling,
    authentication/authorization và cách tổ chức
    controller/service/repository/entity/DTO hiện tại.
2.  Kiểm tra các module liên quan: user/tour, destination, GPS check-in,
    quiz, experience/task, points/wallet hoặc transaction, badge/profile
    và notification (nếu có).
3.  Tái sử dụng các service/bảng hiện có nếu phù hợp; **không tạo hệ
    thống điểm, ví điểm, badge hoặc notification trùng lặp**.
4.  Xác định các event/nghiệp vụ thực tế mà backend đã phát sinh để tính
    tiến độ thành tựu. Không tự giả định tên bảng, field hoặc event.
5.  Báo cáo ngắn gọn thiết kế tích hợp và các điểm chưa rõ trước khi sửa
    những phần kiến trúc lớn.
6.  Tuân thủ kiến trúc và coding style sẵn có của repository; không tự ý
    refactor ngoài phạm vi.

Nếu một tính năng nguồn chưa tồn tại (ví dụ streak hoặc GPS
verification), ghi rõ dependency và không giả lập dữ liệu để tuyên bố
tính năng đã hoạt động.

## 3. Mô hình thành tựu

Mỗi thành tựu cần có tối thiểu:

-   `achievement_code`: mã duy nhất, ổn định, dùng trong code và tích
    hợp event.
-   `name`: tên hiển thị.
-   `description`: mô tả điều kiện/ý nghĩa thành tựu.
-   `category`: nhóm thành tựu.
-   `difficulty` hoặc `tier`: cấp độ Bronze/Silver/Gold/Legendary.
-   `points_reward`: số Journey Points nhận được.
-   `badge_name`: tên huy hiệu.
-   `badge_icon` hoặc `badge_asset`: biểu tượng huy hiệu.
-   `target_value` và thông tin điều kiện phù hợp (nếu thành tựu có tiến
    độ đếm).
-   `is_active`: thành tựu có đang được áp dụng hay không.
-   `created_at`, `updated_at`.

Đây là mô hình logic gợi ý, không phải yêu cầu phải dùng đúng tên cột.
Agent cần điều chỉnh theo chuẩn dự án.

### Trạng thái thành tựu của Tourist

Phân biệt rõ ba trạng thái:

  Trạng thái    Ý nghĩa
  ------------- ------------------------------------------------
  `LOCKED`      Chưa đạt điều kiện
  `CLAIMABLE`   Đã đạt điều kiện, đang chờ Tourist nhận thưởng
  `CLAIMED`     Đã nhận thưởng thành công

Nên lưu tiến độ hiện tại và thời điểm đạt/nhận thành tựu theo từng người
dùng. Với thành tựu chỉ cần đạt/không đạt, tiến độ có thể biểu diễn dạng
boolean hoặc 0/1.

## 4. Danh sách 20 thành tựu khởi đầu

Các mức thưởng dưới đây là cấu hình khởi đầu đề xuất. Có thể điều chỉnh
sau khi cân bằng hệ thống Journey Points, nhưng không tự ý thay đổi tên,
điều kiện hoặc phần thưởng khi chưa được xác nhận.

### Nhóm A -- Khám phá và hoàn thành tour

  -------------------------------------------------------------------------------------
              \# `achievement_code`    Tên thành  Điều kiện   Journey Points Huy hiệu
                 gợi ý                 tựu        đạt                        
  -------------- --------------------- ---------- ----------- -------------- ----------
               1 `FIRST_TOUR`          Bước Chân  Hoàn thành             100 Nhà Khám
                                       Đầu Tiên   tour đầu                   Phá Tập Sự
                                                  tiên trên                  🥉
                                                  JourneyGo                  

               2 `TEN_TOURS`           Người Du   Hoàn thành             500 Nhà Du
                                       Lịch Chăm  10 tour                    Lịch
                                       Chỉ        khác nhau                  Chuyên
                                                                             Nghiệp 🥈

               3 `HUNDRED_TOURS`       Bậc Thầy   Hoàn thành           2.000 Huyền
                                       Khám Phá   100 tour                   Thoại Du
                                                                             Lịch 🥇

               4 `FIVE_DESTINATIONS`   Kẻ Lang    Hoàn thành             300 Dấu Chân
                                       Thang      5 tour                     Muôn Nơi
                                                  thuộc 5 địa                🗺️
                                                  điểm du                    
                                                  lịch khác                  
                                                  nhau                       
  -------------------------------------------------------------------------------------

### Nhóm B -- Check-in và khám phá địa điểm

  ---------------------------------------------------------------------------------------------
              \# `achievement_code` gợi ý     Tên thành  Điều kiện    Journey Points Huy hiệu
                                              tựu        đạt                         
  -------------- ---------------------------- ---------- ------------ -------------- ----------
               5 `FIRST_CHECKIN`              Dấu Chân   Check-in GPS             50 Người Đặt
                                              Đầu Tiên   hợp lệ tại                  Chân Đến
                                                         địa điểm du                 📍
                                                         lịch đầu                    
                                                         tiên                        

               6 `TWENTY_CHECKINS`            Nhà Sưu    Check-in hợp            400 Nhà Sưu
                                              Tầm Địa    lệ tại 20                   Tầm 🧭
                                              Điểm       địa điểm                    
                                                         khác nhau                   

               7 `EARLY_BIRD_CHECKIN`         Chinh Phục Check-in GPS            150 Người Đón
                                              Bình Minh  hợp lệ tại                  Bình Minh
                                                         địa điểm du                 🌅
                                                         lịch trước                  
                                                         06:00 sáng                  
                                                         theo múi giờ                
                                                         địa điểm                    

               8 `FIVE_SPECIAL_EXPERIENCES`   Thợ Săn Bí Check-in hợp            350 Thợ Săn Bí
                                              Ẩn         lệ tại 5 địa                Ẩn 🔍
                                                         điểm có hoạt                
                                                         động/nhiệm                  
                                                         vụ trải                     
                                                         nghiệm đặc                  
                                                         biệt                        
  ---------------------------------------------------------------------------------------------

### Nhóm C -- Văn hóa và tri thức du lịch

  ---------------------------------------------------------------------------------------------
              \# `achievement_code` gợi ý       Tên thành  Điều kiện  Journey Points Huy hiệu
                                                tựu        đạt                       
  -------------- ------------------------------ ---------- ---------- -------------- ----------
               9 `READ_TEN_CULTURAL_CONTENTS`   Người Gìn  Đọc/khám              200 Người Gìn
                                                Giữ Văn    phá 10 nội                Giữ Di Sản
                                                Hóa        dung văn                  📜
                                                           hóa, lịch                 
                                                           sử hoặc di                
                                                           sản                       

              10 `TEN_QUIZZES_80_PERCENT`       Bộ Óc Tri  Hoàn thành            400 Bậc Thầy
                                                Thức       10 bài                    Tri Thức
                                                           quiz, mỗi                 🎓
                                                           bài đạt tỷ                
                                                           lệ đúng từ                
                                                           80% trở                   
                                                           lên                       

              11 `PERFECT_QUIZ`                 Không Một  Hoàn thành            150 Nhà Vô
                                                Lỗi Sai    một bài                   Địch Quiz
                                                           quiz với                  🏆
                                                           100% câu                  
                                                           trả lời                   
                                                           chính xác                 

              12 `FIVE_HERITAGE_DESTINATIONS`   Sứ Giả Di  Khám phá              500 Sứ Giả Văn
                                                Sản        nội dung                  Hóa 🪷
                                                           văn hóa                   
                                                           tại 5 địa                 
                                                           điểm di                   
                                                           sản khác                  
                                                           nhau                      
  ---------------------------------------------------------------------------------------------

### Nhóm D -- Trải nghiệm và thử thách

  ----------------------------------------------------------------------------------------------
              \# `achievement_code` gợi ý        Tên thành  Điều kiện  Journey Points Huy hiệu
                                                 tựu        đạt                       
  -------------- ------------------------------- ---------- ---------- -------------- ----------
              13 `FIVE_EXPERIENCE_TASKS`         Người      Hoàn thành            250 Chiến Binh
                                                 Chinh Phục 5 nhiệm vụ                Trải
                                                 Thử Thách  trải                      Nghiệm ⚔️
                                                            nghiệm                    
                                                            khác nhau                 

              14 `FIVE_SUCCESSIVE_EXPERIENCES`   Bách Chiến Hoàn thành            400 Bậc Thầy
                                                 Bách Thắng liên tiếp                 Thử Thách
                                                            5 nhiệm vụ                ⭐
                                                            trải                      
                                                            nghiệm mà                 
                                                            không thất                
                                                            bại                       

              15 `SPECIAL_REWARD_EXPERIENCE`     Kho Báu Bí Hoàn thành            200 Kẻ Săn Kho
                                                 Mật        một nhiệm                 Báu 💎
                                                            vụ trải                   
                                                            nghiệm có                 
                                                            phần                      
                                                            thưởng đặc                
                                                            biệt                      

              16 `TWENTY_EXPERIENCE_TASKS`       Không Gì   Hoàn thành            700 Huyền
                                                 Là Không   20 nhiệm                  Thoại Thử
                                                 Thể        vụ trải                   Thách 🏅
                                                            nghiệm                    
  ----------------------------------------------------------------------------------------------

### Nhóm E -- Hoạt động và lòng trung thành

  -----------------------------------------------------------------------------------------------
              \# `achievement_code` gợi ý       Tên thành   Điều kiện  Journey Points Huy hiệu
                                                tựu         đạt                       
  -------------- ------------------------------ ----------- ---------- -------------- -----------
              17 `THREE_DAY_STREAK`             Ngọn Lửa    Có hoạt               100 Ngọn Lửa
                                                Khám Phá    động khám                 Nhỏ 🔥
                                                            phá hợp lệ                
                                                            trong 3                   
                                                            ngày liên                 
                                                            tiếp                      

              18 `SEVEN_DAY_STREAK`             Đam Mê Bất  Có hoạt               300 Ngọn Lửa
                                                Tận         động khám                 Bền Bỉ 🔥
                                                            phá hợp lệ                
                                                            trong 7                   
                                                            ngày liên                 
                                                            tiếp                      

              19 `THIRTY_DAY_STREAK`            Nhà Khám    Có hoạt             1.000 Ý Chí Vàng
                                                Phá Kiên    động khám                 🌟
                                                Định        phá hợp lệ                
                                                            trong 30                  
                                                            ngày liên                 
                                                            tiếp                      

              20 `TEN_THOUSAND_POINTS_EARNED`   Huyền Thoại Đạt tổng            2.000 Huyền Thoại
                                                JourneyGo   cộng                      JourneyGo
                                                            10.000                    👑
                                                            Journey                   
                                                            Points từ                 
                                                            hoạt động                 
                                                            trên nền                  
                                                            tảng                      
  -----------------------------------------------------------------------------------------------

## 5. Quy tắc nghiệp vụ cần triển khai

### 5.1. Tính tiến độ và phát hiện thành tựu

-   Tiến độ phải được cập nhật từ nghiệp vụ backend đáng tin cậy, ví dụ
    tour hoàn thành, check-in được xác thực, quiz được chấm điểm và
    nhiệm vụ trải nghiệm hoàn thành.
-   Không tin các giá trị do client tự gửi như số tour đã hoàn thành, số
    check-in, điểm quiz hoặc tổng điểm.
-   Ưu tiên cập nhật theo event/transaction nghiệp vụ sau khi thao tác
    nguồn thành công. Nếu dự án chưa có event-driven architecture, dùng
    service/domain event hoặc cơ chế phù hợp với kiến trúc hiện tại.
-   Không để một event được xử lý lặp làm tăng tiến độ nhiều lần. Cần cơ
    chế idempotency/deduplication theo ID nghiệp vụ.
-   Chỉ chuyển sang `CLAIMABLE` khi điều kiện thực sự đạt.
-   Thành tựu đã đạt không bị hạ trạng thái chỉ vì dữ liệu nguồn thay
    đổi về sau, trừ khi có quy tắc nghiệp vụ được phê duyệt rõ ràng.

### 5.2. Nhận thưởng

-   Tourist chỉ được nhận thành tựu ở trạng thái `CLAIMABLE`.
-   Khi nhận thành công, cập nhật thành `CLAIMED`, ghi nhận thời điểm
    nhận và cấp thưởng.
-   Việc cập nhật trạng thái nhận thưởng và cộng Journey Points phải an
    toàn trong transaction hoặc cơ chế nhất quán tương đương.
-   Chống nhận thưởng nhiều lần khi client gửi request lặp, retry hoặc
    gửi đồng thời.
-   Tái sử dụng points/wallet/ledger service hiện có. Nếu chưa có, báo
    cáo trước khi thiết kế cơ chế cộng điểm mới.
-   Không cấp thưởng chỉ dựa trên việc client gửi `achievementId`;
    backend phải xác minh quyền sở hữu và trạng thái thành tựu.
-   Lưu lịch sử giao dịch thưởng để kiểm toán và xử lý sự cố.

### 5.3. Quy tắc cần xác nhận/ghi rõ trong implementation

Một số điều kiện cần Agent kiểm tra khả năng hỗ trợ của hệ thống hiện
tại và ghi rõ giả định:

-   **Tour khác nhau:** xác định theo tour ID duy nhất hay theo địa
    điểm; không đếm việc hoàn thành lặp cùng một tour nếu điều kiện yêu
    cầu khác nhau.
-   **Địa điểm khác nhau:** xác định theo destination/location ID.
-   **Check-in GPS hợp lệ:** phải dựa trên kết quả xác thực server hiện
    có; không chỉ tin tọa độ client.
-   **Trước 06:00:** dùng timezone của địa điểm, xử lý đúng ngày/giờ địa
    phương.
-   **Quiz 80%:** xác định cách tính phần trăm và chỉ tính các lượt hoàn
    thành hợp lệ.
-   **Năm nhiệm vụ liên tiếp:** cần định nghĩa rõ một nhiệm vụ thất bại
    có reset chuỗi hay không; mặc định reset chuỗi.
-   **Phần thưởng đặc biệt:** cần có dấu hiệu/loại reward xác định được
    ở dữ liệu nhiệm vụ.
-   **Streak:** cần định nghĩa "hoạt động khám phá hợp lệ" và múi giờ áp
    dụng; không tự tính streak chỉ từ việc đăng nhập nếu yêu cầu là hoạt
    động khám phá.
-   **10.000 Journey Points:** cần xác định là tổng điểm đã kiếm được
    (lifetime earned) hay số dư hiện tại. Khuyến nghị dùng tổng điểm đã
    kiếm được, không trừ điểm đã tiêu.
-   **Đọc nội dung:** cần định nghĩa thế nào là "đã đọc/đã khám phá" (ví
    dụ có bản ghi hoàn thành hoặc đạt ngưỡng tương tác); không tính chỉ
    vì mở màn hình nếu chưa có quy tắc.

## 6. Tourist API -- triển khai giai đoạn 1

Các endpoint dưới đây là đề xuất REST. Agent cần điều chỉnh prefix,
response envelope và cách đặt tên theo convention hiện có.

  ------------------------------------------------------------------------------------------------------
  Method                  Endpoint gợi ý                                         Mục đích
  ----------------------- ------------------------------------------------------ -----------------------
  `GET`                   `/api/v1/tourist/achievements`                         Lấy danh sách thành tựu
                                                                                 của Tourist, gồm trạng
                                                                                 thái và tiến độ

  `GET`                   `/api/v1/tourist/achievements/{achievementId}`         Xem chi tiết một thành
                                                                                 tựu và tiến độ của
                                                                                 người dùng hiện tại

  `GET`                   `/api/v1/tourist/achievements/summary`                 Lấy tổng số đã đạt, chờ
                                                                                 nhận, đã nhận và điểm
                                                                                 thưởng từ thành tựu
                                                                                 (nếu hữu ích với UI)

  `POST`                  `/api/v1/tourist/achievements/{achievementId}/claim`   Nhận thưởng thành tựu
                                                                                 đã đạt
  ------------------------------------------------------------------------------------------------------

Yêu cầu:

-   Xác định Tourist từ access token/security context; không nhận
    `userId` tùy ý từ request body để thao tác dữ liệu người khác.
-   Có pagination/filter theo category, status hoặc tier nếu phù hợp.
-   Danh sách cần trả đủ thông tin để frontend hiển thị tên, mô tả,
    icon, điểm thưởng, tiến độ, trạng thái và thời điểm đạt/nhận (nếu
    có).
-   API detail chỉ truy cập dữ liệu của Tourist đang đăng nhập.
-   Claim phải idempotent/an toàn khi request đồng thời; trả lỗi nghiệp
    vụ rõ ràng nếu chưa đủ điều kiện hoặc đã nhận.
-   Chỉ hiển thị thành tựu đang active cho luồng người dùng thông
    thường; xử lý các thành tựu đã bị deactivate theo quy tắc nhất quán,
    không làm mất lịch sử nhận thưởng.

**Không tạo API POST/PUT/PATCH/DELETE cho Tourist để CRUD định nghĩa
thành tựu.**

## 7. Admin API -- triển khai giai đoạn 2

Chỉ bắt đầu sau khi giai đoạn Tourist API hoàn thành và được kiểm thử.

  ----------------------------------------------------------------------------------------------
  Method                  Endpoint gợi ý                                 Mục đích
  ----------------------- ---------------------------------------------- -----------------------
  `GET`                   `/api/v1/admin/achievements`                   Xem danh sách/cấu hình
                                                                         thành tựu

  `GET`                   `/api/v1/admin/achievements/{achievementId}`   Xem chi tiết cấu hình

  `POST`                  `/api/v1/admin/achievements`                   Tạo thành tựu

  `PUT` hoặc `PATCH`      `/api/v1/admin/achievements/{achievementId}`   Cập nhật cấu hình

  `DELETE` hoặc           `/api/v1/admin/achievements/{achievementId}`   Xóa hoặc vô hiệu hóa
  deactivate                                                             thành tựu theo chính
                                                                         sách dữ liệu
  ----------------------------------------------------------------------------------------------

Yêu cầu:

-   Chỉ role Admin được phép truy cập; kiểm tra quyền ở backend, không
    chỉ ẩn UI.
-   Validate `achievement_code` duy nhất, tên, mô tả, category, tier,
    điều kiện, điểm thưởng và badge.
-   Không cho sửa `achievement_code` sau khi đã được dùng để ghi nhận
    tiến độ/event, trừ khi có migration an toàn.
-   Ưu tiên deactivate/soft delete nếu thành tựu đã có người dùng đạt
    hoặc nhận thưởng, để giữ lịch sử.
-   Cân nhắc tác động khi thay đổi điều kiện/phần thưởng của thành tựu
    đang hoạt động; ghi nhận audit log nếu hệ thống có hỗ trợ.
-   Không cho phép Admin sửa lịch sử claim để tạo thưởng giả; thao tác
    điều chỉnh thủ công (nếu có nhu cầu) phải là chức năng riêng, có
    phân quyền và audit.

## 8. Gợi ý cấu trúc dữ liệu

Đây là gợi ý khái niệm, Agent phải đối chiếu schema hiện có trước khi
tạo migration.

### `achievements`

Lưu định nghĩa thành tựu:

-   ID
-   achievement code
-   name, description
-   category, tier
-   condition type/configuration hoặc target value
-   points reward
-   badge name/icon/asset
-   active flag
-   created/updated timestamps

### `user_achievements`

Lưu trạng thái và tiến độ theo người dùng:

-   ID
-   user ID
-   achievement ID
-   current progress
-   target progress (nếu áp dụng)
-   status (`LOCKED`, `CLAIMABLE`, `CLAIMED`)
-   achieved at
-   claimed at
-   created/updated timestamps

Cần unique constraint phù hợp trên cặp `(user_id, achievement_id)` nếu
mỗi Tourist chỉ có một bản ghi tiến độ cho mỗi thành tựu.

### Lịch sử cấp thưởng

Trước tiên kiểm tra points/wallet/transaction ledger hiện tại. Nếu đã có
ledger thì dùng lại. Nếu chưa có, đề xuất bảng lịch sử riêng có tối
thiểu:

-   user ID
-   achievement ID
-   reward type
-   reward amount
-   transaction/reference key duy nhất
-   created at

Không tạo bảng trùng chức năng với ledger đang tồn tại.

## 9. Bảo mật, toàn vẹn dữ liệu và hiệu năng

-   Authentication bắt buộc cho Tourist API và Admin API.
-   Authorization theo role ở backend.
-   Validate mọi input; giới hạn pagination và kích thước payload.
-   Dùng transaction cho claim và cấp điểm.
-   Dùng unique constraint/idempotency để ngăn duplicate reward.
-   Không cho Tourist xem hoặc claim tiến độ của Tourist khác.
-   Không tin client về GPS, quiz score, số lượng tour hoặc điểm.
-   Tránh N+1 query khi lấy danh sách thành tựu và tiến độ.
-   Có index cho các cột tra cứu thường xuyên như achievement code, user
    ID, achievement ID, status.
-   Không log access token, dữ liệu nhạy cảm hoặc thông tin xác thực.

## 10. Kiểm thử và tiêu chí nghiệm thu

### Tourist API

-   Tourist chưa đăng nhập không truy cập được API.
-   Tourist chỉ xem được tiến độ của chính mình.
-   Danh sách trả đúng trạng thái `LOCKED`, `CLAIMABLE`, `CLAIMED`.
-   Thành tựu chỉ chuyển sang `CLAIMABLE` khi điều kiện backend đạt.
-   Claim khi chưa đạt bị từ chối.
-   Claim hợp lệ cộng đúng số điểm và chuyển trạng thái thành `CLAIMED`.
-   Gửi claim lặp hoặc đồng thời không cộng điểm nhiều lần.
-   Event nghiệp vụ bị xử lý lặp không làm tăng progress hoặc thưởng
    trùng.
-   Pagination/filter hoạt động đúng nếu được triển khai.

### Admin API

-   Tourist/role không có quyền Admin không thể CRUD thành tựu.
-   Admin có thể tạo, xem, cập nhật và deactivate/xóa theo chính sách.
-   Không tạo được `achievement_code` trùng.
-   Không xóa cứng làm mất lịch sử người dùng đã nhận thưởng.
-   Thay đổi cấu hình không làm sai dữ liệu tiến độ/lịch sử cũ.

### Tài liệu và bàn giao

-   Có migration/schema cập nhật theo convention dự án.
-   Có request/response mẫu hoặc API documentation theo chuẩn dự án.
-   Có unit/integration tests cho điều kiện, quyền truy cập, claim và
    chống nhận thưởng trùng.
-   Ghi rõ những điều kiện chưa thể triển khai do thiếu module nguồn.
-   Tổng kết file đã tạo/sửa, endpoint, migration, cách chạy test và các
    quyết định thiết kế.

## 11. Chia task cho Agent

### Phase 0 -- Khảo sát

-   [ ] Đọc repository và quy ước kiến trúc.
-   [ ] Xác định module nguồn cho tour, check-in, quiz, experience,
    points, streak và user role.
-   [ ] Đề xuất schema/API và cách cập nhật tiến độ.
-   [ ] Liệt kê dependency hoặc điều kiện chưa được hệ thống hỗ trợ.

### Phase 1 -- Tourist API (ưu tiên cao nhất)

-   [ ] Tạo schema/entity/repository cần thiết cho achievement và user
    progress.
-   [ ] Seed/configure 20 thành tựu khởi đầu bằng cơ chế phù hợp với dự
    án.
-   [ ] Implement logic cập nhật progress và chuyển trạng thái.
-   [ ] Implement Tourist list/detail/summary/claim APIs.
-   [ ] Tích hợp cấp Journey Points với service hiện có.
-   [ ] Implement authorization, transaction, idempotency và tests.
-   [ ] Cập nhật API documentation.

### Phase 2 -- Admin API

-   [ ] Implement Admin list/detail/create/update/deactivate APIs.
-   [ ] Implement validation và authorization.
-   [ ] Bảo vệ lịch sử tiến độ/claim khi cấu hình thay đổi.
-   [ ] Bổ sung tests và API documentation.

## 12. Chỉ dẫn cuối cho AI Agent

-   Làm **Phase 0**, sau đó triển khai **Phase 1 Tourist API trước**.
-   Không triển khai Admin CRUD cho đến khi Tourist API đã hoàn thành và
    kiểm thử.
-   Không tự ý tạo CRUD định nghĩa thành tựu cho Tourist.
-   Không tự tạo hoặc thay thế points/wallet, GPS verification, quiz,
    tour hay experience modules nếu repository đã có các module tương
    ứng.
-   Không giả định các bảng, field, class hoặc service chưa được kiểm
    tra trong repository.
-   Nếu có xung đột giữa tài liệu này và kiến trúc thực tế, giữ nguyên
    kiến trúc dự án, nêu rõ khác biệt và đề xuất phương án trước khi
    thay đổi lớn.
-   Sau mỗi phase, báo cáo các file đã thay đổi, endpoint hoàn thành,
    migration, test result và phần còn thiếu.
