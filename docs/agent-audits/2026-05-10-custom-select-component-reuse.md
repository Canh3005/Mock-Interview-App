# PA Audit - Không dùng lại component chọn tùy biến

Date: 2026-05-10
Status: guide-updated

## Lỗi quan sát được

Trong luồng Public Question Bank, `QuestionBankFilters.jsx` tự định nghĩa `SelectControl` bằng thẻ HTML gốc `<select>` cho danh sách lựa chọn của bộ lọc. Cách này lệch với component `SelectField` tùy biến đã có trong `QuestionBankFormFields.jsx` và đang được dùng ở các màn quản trị Question Bank như `ProbeFilterBar.jsx`, `ProbeFormModal.jsx`, `InterviewSetFormModal.jsx`.

## Ảnh hưởng

UI bộ lọc của ứng viên không nhất quán với component tùy biến đã có: danh sách lựa chọn kém đẹp hơn, tương tác khác phần còn lại của Question Bank, và làm tăng trùng lặp code khi sau này cần chỉnh kiểu hiển thị hoặc hành vi chọn lựa.

## Nguyên nhân gốc

Dev đã triển khai bộ lọc theo yêu cầu chức năng nhưng chỉ rà mẫu ở mức luồng Public Question Bank mới, chưa kiểm tra component dùng chung hoặc component cùng khu vực tính năng đã tồn tại. Guide hiện tại có nhắc việc dùng lại mẫu hiện có và không trùng lặp UI, nhưng chưa đủ cụ thể để buộc Dev dừng lại trước khi tự tạo component nhập liệu/lựa chọn mới.

## Rào chắn bị thiếu

- Dev guide thiếu danh sách kiểm tra rõ: trước khi tạo input/select/checkbox hoặc component bộ lọc mới, phải tìm component tương đương trong cùng khu vực tính năng hoặc thư viện UI dùng chung.
- Convention FE có quy tắc DRY chung, nhưng chưa nêu rõ việc tự viết lại component điều khiển bằng thẻ HTML gốc là lỗi khi đã có component tùy biến tương đương.
- Review FE chưa có mục bắt lỗi “tự tạo component điều khiển trùng component sẵn có”, nên người review dễ chỉ nhìn hành vi chức năng và bỏ qua sự không nhất quán UI.

## Bằng chứng

- `client/apps/web/src/components/question-bank/QuestionBankFilters.jsx`: trước khi sửa có `SelectControl` cục bộ hiển thị `<select>` cho các lựa chọn bộ lọc.
- `client/apps/web/src/components/admin/question-bank/QuestionBankFormFields.jsx`: đã có `SelectField` tùy biến với dropdown, dấu chọn và kiểu hiển thị thống nhất.
- `client/apps/web/src/components/admin/question-bank/ProbeFilterBar.jsx`: đã dùng `SelectField` cho bộ lọc admin cùng khu vực Question Bank.
- `docs/features/020-public-question-bank-browse-search/HOW.md`: yêu cầu component có cấu trúc cho tìm kiếm, bộ lọc và sắp xếp, nhưng không chỉ rõ việc tái sử dụng component có sẵn.

## Thay đổi guide

- `docs/agent-guide/dev-guide.md`: thêm bước rà component UI có sẵn trước khi tạo component điều khiển mới.
- `docs/agent-guide/convention-fe.md`: thêm quy tắc tái sử dụng component UI/input/bộ lọc hiện có và chỉ tạo component mới khi không có lựa chọn phù hợp.
- `docs/agent-guide/review-fe.md`: thêm danh sách kiểm tra review để bắt lỗi tự tạo component điều khiển bằng thẻ HTML gốc hoặc component tùy biến cục bộ trùng với component đã có.
- `docs/agent-audits/INDEX.md`: thêm bản ghi để các luồng Dev/Review FE sau này mở đúng audit khi gặp triệu chứng tương tự.

## Theo dõi tiếp

Code hiện tại đã được sửa để `QuestionBankFilters.jsx` dùng `SelectField`. Không cần sửa thêm feature code trong PA này.
