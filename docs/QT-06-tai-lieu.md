# QT-06: Tiếp nhận và phát hành tài liệu

**Mục tiêu:** admin tiếp nhận tài liệu từ nhà cung cấp, phân loại và phân quyền xem theo phòng ban; thành viên thấy tài liệu mới ngay khi được đăng, không cần tải lại trang.

**Tác nhân:** Admin (tiếp nhận, sửa, thay file, xóa). User (xem, tìm, mở, tải xuống). Hệ thống (phân quyền, thông báo realtime).

**Kích hoạt:** nhà cung cấp gửi tài liệu cho admin ngoài hệ thống (email, ổ đĩa, tin nhắn).

## Luồng chính
1. Admin vào Tài liệu, bấm Tiếp nhận tài liệu.
2. Admin chọn hoặc kéo thả một hoặc nhiều file, chọn thư mục (hoặc Chưa phân loại), chọn ai xem được (mọi người hoặc một phòng ban) và ghi nguồn.
3. Hệ thống kiểm tra từng file (định dạng, kích thước tối đa 25 MB), tải lên kho riêng tư, rồi tạo dòng tài liệu. Mỗi file có trạng thái riêng: chờ, đang tải, đã tiếp nhận, lỗi.
4. Realtime: mọi thành viên có quyền xem thấy tài liệu xuất hiện trong danh sách; menu Tài liệu hiện số tài liệu mới; nếu đang mở trang thì hiện dòng báo.
5. Thành viên tìm theo tên, mô tả, nguồn (không phân biệt dấu), lọc theo thư mục, bấm Mở (PDF, ảnh, TXT) hoặc Tải xuống.
6. Cập nhật: admin bấm Sửa để đổi thông tin, ghim, chuyển thư mục hoặc phòng ban, hoặc Thay file mới (phiên bản tăng 1; mọi người thấy bản mới ngay).
7. Gỡ: admin xóa tài liệu (xóa cả file).

## Luồng lỗi
- **Không có quyền:** user không thấy nút Tiếp nhận hoặc Sửa; nếu gọi trực tiếp vẫn bị từ chối ở database và kho file.
- **File không hợp lệ:** sai định dạng, rỗng hoặc quá 25 MB thì file đó báo lỗi, các file khác vẫn tải bình thường.
- **Mất mạng giữa chừng hoặc ghi dòng tài liệu thất bại:** file đã tải lên được dọn lại, không để file mồ côi; admin chọn lại file lỗi.
- **Tài liệu giới hạn phòng ban:** người ngoài phòng đó không thấy dòng tài liệu và không tải được file kể cả khi biết đường dẫn.
- **Đường dẫn tải hết hạn (1 giờ):** bấm lại để lấy đường dẫn mới.

## Thông báo
Thành viên có quyền xem nhận huy hiệu số tài liệu mới ở menu và dòng báo realtime. Người đăng không nhận thông báo về chính tài liệu mình đăng. (Thông báo trong chuông sẽ làm ở module Thông báo.)

## Tiêu chí nghiệm thu (Cho, Khi, Thì)
1. Cho admin đã đăng nhập, khi tải lên 3 file hợp lệ cùng lúc, thì cả 3 xuất hiện trong danh sách và mỗi file có trạng thái Đã tiếp nhận.
2. Cho một user đang mở trang Tài liệu ở máy khác, khi admin tải lên một file, thì file hiện trong danh sách của user trong vài giây mà không tải lại trang, kèm dòng báo tài liệu mới.
3. Cho user đang ở trang khác, khi admin tải lên file, thì menu Tài liệu hiện huy hiệu số 1; mở trang Tài liệu thì huy hiệu biến mất.
4. Cho tài liệu giới hạn Phòng QC, khi user Phòng Sản xuất mở danh sách, thì không thấy tài liệu đó.
5. Cho tài liệu giới hạn Phòng QC, khi user Phòng Sản xuất thử tải file bằng đường dẫn đã biết, thì bị từ chối.
6. Cho user thường, khi vào trang Tài liệu, thì không có nút Tiếp nhận, Thư mục, Sửa.
7. Cho file định dạng .exe hoặc lớn hơn 25 MB, khi chọn tải lên, thì file bị từ chối với thông báo lỗi và không được tạo.
8. Cho tài liệu có phiên bản 1, khi admin thay file mới, thì phiên bản thành 2, người dùng thấy dòng Phiên bản 2 và tải về file mới.
9. Cho thư mục giới hạn Phòng HR, khi admin chuyển tài liệu vào thư mục đó, thì tài liệu tự giới hạn Phòng HR.
10. Cho người dùng bị khóa tài khoản, khi mở Tài liệu, thì không đọc được dữ liệu nào.
11. Cho admin xóa một tài liệu, khi user mở lại trang, thì tài liệu biến mất khỏi danh sách.

## Giả định cần chủ dự án xác nhận
- Chỉ admin được tải tài liệu (nhà cung cấp không có tài khoản). Nếu muốn nhà cung cấp tự gửi file qua liên kết, cần thiết kế riêng vì rủi ro bảo mật.
- Chấp nhận các định dạng: PDF, Word, Excel, PowerPoint, CSV, TXT, PNG, JPG (không nhận file nén ZIP).
- Giới hạn 25 MB mỗi file (cần kiểm tra giới hạn thực tế của gói Supabase đang dùng).
