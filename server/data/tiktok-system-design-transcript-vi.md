# Transcript Phỏng Vấn System Design TikTok

## Giới thiệu

- Người phỏng vấn: Thiết kế TikTok. Xin chào mọi người, hôm nay tôi có mặt ở đây cùng Adam, và chúng ta sẽ thực hiện một buổi phỏng vấn system design giả lập. Tôi rất vui được có Adam trong video này. Adam, bạn có thể giới thiệu bản thân và kể một chút về công việc của bạn không?
- Ứng viên: Được thôi. Xin chào, tôi là Adam. Tôi làm về cloud engineering và các hệ thống back-end, hiện tại đang ở Oracle, nhưng sắp tới tôi sẽ chuyển sang Google.
- Người phỏng vấn: Tuyệt vời. Chúng ta rất hào hứng được bắt đầu buổi luyện tập phỏng vấn system design hôm nay.

## Câu hỏi

- Người phỏng vấn: Câu hỏi hôm nay là: thiết kế TikTok.
- Ứng viên: Okay, hay đấy. Thiết kế TikTok. Thú vị nhỉ. Thực ra tôi chưa từng dùng TikTok bao giờ.

## Câu hỏi làm rõ yêu cầu

- Ứng viên: Tốt. Có lẽ chúng ta có thể bắt đầu bằng cách, nếu bạn có thể cho tôi — tôi đã có ý tưởng rồi, tất nhiên tôi biết TikTok là gì, nhưng nếu bạn có thể cho tôi một cái nhìn tổng quan nhanh về những gì chúng ta đang tìm kiếm, và có thể cụ thể hơn về phần TikTok mà chúng ta muốn tập trung vào.
- Người phỏng vấn: Tốt thôi. Tổng quan về TikTok là nó là một ứng dụng di động để chia sẻ video giữa các người dùng. Ý tưởng cơ bản là bạn có thể tải video lên TikTok, và sau đó bạn có thể xem một feed các video. Bạn xem một video tại một thời điểm, vuốt lên thì xem video tiếp theo. Bạn có thể follow người dùng khác, để xem các video họ đăng, và bạn cũng có thể thực hiện các hành động trên video đó, như yêu thích hoặc bình luận. Tôi nghĩ đó là những tính năng cơ bản chúng ta sẽ muốn hỗ trợ.
- Ứng viên: Được rồi. Hợp lý. Xin lỗi, để tôi dành một phút ghi chú nhanh.
- Người phỏng vấn: Không sao. Trong lúc đó, tôi sẽ chuyển sang chia sẻ màn hình với bảng trắng của chúng ta.
- Ứng viên: Ổn. Nhìn có vẻ TikTok là một ứng dụng di động. Nếu bạn đồng ý, tôi nghĩ tôi sẽ chỉ tập trung vào hạ tầng back-end và không đi quá sâu vào phần ứng dụng di động, vì tôi nghĩ có nhiều chi tiết phong phú hơn ở phía hệ thống back-end.
- Người phỏng vấn: Vâng, nghe hay đấy.
- Ứng viên: Từ những gì tôi thấy, điều đầu tiên tôi muốn đi vào là các yêu cầu chức năng (functional requirements). Khi tôi nói yêu cầu chức năng, tôi có nghĩa là các nhóm công việc cấp cao mà chúng ta muốn xem xét.
- Ứng viên: Điều đầu tiên, từ những gì bạn giải thích, là upload video. Một người dùng từ thiết bị di động của họ — hoặc thực ra về mặt lý thuyết, vì chúng ta đang chỉ phân tách thiết bị và back-end — nếu được, tôi sẽ giả định rằng chúng ta chỉ tạo một API không phụ thuộc vào client cụ thể nào, và API đó sẽ nhận dữ liệu người dùng để upload video.
- Ứng viên: Tôi sẽ gọi đây là yêu cầu chức năng số một: upload video. Khi chúng ta upload video, những video này có giới hạn thời gian phải không? Tương tự Instagram, mỗi video chỉ khoảng 15 giây. Đúng không?
- Người phỏng vấn: Đúng. Chúng ta có thể giả định chúng dài từ 30 giây đến tối đa một phút.
- Ứng viên: Okay, vậy tối đa một phút. Tốt. Tôi cũng giả định rằng nếu tôi đang upload video, liệu có văn bản kèm theo không? Tương tự như Instagram hay Facebook, nơi bạn có thể upload ảnh, nhưng cũng có thể gắn thẻ và thêm văn bản và những thứ như vậy?
- Người phỏng vấn: Vâng, câu hỏi hay đấy. Giả sử bạn có thể thêm bình luận hoặc caption. Chúng ta không cần đi vào chi tiết của việc gắn thẻ và cách hoạt động của nó, nhưng vâng, có thể có một số dữ liệu văn bản đi kèm.
- Ứng viên: Okay, tốt. Upload, vậy thì mình nói: video cộng với văn bản. Tốt.
- Ứng viên: Rồi yêu cầu số hai, tôi đang nghĩ là xem feed. Khi tôi nghĩ về việc xem feed, những gì chúng ta đang làm là tổng hợp video. Sửa cho tôi nếu sai, chúng ta có đang nói về việc tổng hợp video từ những người tôi đang follow không? Hay là người tôi follow cộng thêm — tôi biết TikTok có một thuật toán đặc biệt để lấy các video được đề xuất. Có thể nó là sự kết hợp của hai điều đó không?
- Người phỏng vấn: Vâng, tôi nghĩ đó là câu hỏi hay. Để đơn giản, chúng ta có thể tập trung vào video của những người bạn đang follow, nhưng tôi cũng muốn nghe về cách bạn tạo ra tính năng trending hoặc đề xuất video.
- Ứng viên: Với mục đích này, bạn có muốn tôi bao gồm khả năng bình luận, thích video như một phần của chức năng đó không?
- Người phỏng vấn: Vâng, hãy thử xây dựng cách chúng ta sẽ yêu thích video và follow các creator cụ thể.
- Ứng viên: Okay, tốt. Đó thực ra là yêu cầu chức năng tiếp theo của tôi — follow người dùng. Vậy là: yêu thích, follow, bình luận, chuyển tiếp — tôi không biết họ có cho phép điều đó không, nhưng tôi sẽ gộp tất cả vào như một loại endpoint tương tác video.
- Người phỏng vấn: Được thôi.

## Trả lời

- Ứng viên: Tốt. Vậy là các yêu cầu chức năng tổng quan đã xong. Rất nhanh thôi, tôi chỉ muốn nói về các yêu cầu phi chức năng (non-functional requirements). Phi chức năng có nghĩa là tính sẵn sàng (availability), độ trễ (latency), và quy mô (scale).
- Ứng viên: Theo tôi thấy — tôi sẽ đưa ra một giả định ở đây — hệ thống này cần có tính sẵn sàng cao, đơn giản vì quy mô người dùng sẽ sử dụng nó. Nghe có vẻ sẽ rất nhiều người, và vì nó phục vụ video, nên nó thực sự cần có tính sẵn sàng cao. Tôi sẽ nói khoảng 99.999% availability, nghe có hợp lý không?
- Người phỏng vấn: Vâng, nghe có vẻ tốt.
- Ứng viên: Luôn có những đánh đổi này. Khi tôi nghĩ về cách thiết kế hệ thống, tôi đang cố hiểu xem nếu không cần quá cao thì có thể nó không cần sẵn sàng đến vậy — có thể có những điều chúng ta có thể làm để cân bằng ngân sách và cách chúng ta phân bổ tài nguyên tính toán, v.v.
- Ứng viên: Cũng cần nghĩ về độ trễ. Một điều tốt là, từ những gì nghe thấy, vì đây là thiết bị di động, có vẻ như chúng ta có thể cache rất nhiều nội dung trên chính thiết bị. Khi lần đầu tiên kéo dữ liệu, chúng ta sẽ có thể lấy những thứ cấp cao nhất rất nhanh, nhưng sau đó chúng ta có thể kéo thêm trong nền. Nghe có vẻ chúng ta có một chút linh hoạt ở đó. Nghe đúng không?
- Người phỏng vấn: Vâng, nghe ổn. Tôi nghĩ có thể sau đó chúng ta có thể nói một chút về độ trễ, hoặc cách điều này khác nhau giữa các tính năng, chẳng hạn như upload so với download, và cách suy nghĩ về điều đó.
- Ứng viên: Vâng, okay. Tôi chỉ ghi TBD cho cái đó.

## Yêu cầu

- Ứng viên: Tốt. Chúng ta có: upload video, xem feed, follow người dùng, và tương tác video như yêu thích, thích, bình luận, và có thể chuyển tiếp.
- Ứng viên: Upload video có nghĩa là dữ liệu người dùng cộng với video. Video dài khoảng 30 giây đến tối đa một phút. Chúng có thể bao gồm một số văn bản, như bình luận hoặc caption, nhưng chúng ta không đi vào chi tiết như gắn thẻ.
- Ứng viên: Đối với xem feed, chúng ta có thể đang tổng hợp video từ những người mà người dùng đang follow. Để đơn giản, chúng ta có thể tập trung vào điều đó, nhưng chúng ta cũng có thể nói về trending hoặc đề xuất.
- Ứng viên: Đối với tương tác video, tôi đang nghĩ đến một endpoint hoạt động người dùng (user activity), hoặc gì đó trong lĩnh vực đó, sẽ ghi lại việc follow, yêu thích, thích và các hành động tương tự.
- Ứng viên: Yêu cầu phi chức năng là tính sẵn sàng cao, độ trễ, và quy mô. Nó cần có tính sẵn sàng cao, khoảng 99.999%, và độ trễ có thể được cải thiện bằng cách cache nội dung trên thiết bị và tải trước nội dung trong nền.
- Ứng viên: Quy mô là điều tiếp theo cần làm rõ. Bạn có thể cho tôi ước tính sơ bộ về người dùng không? Nếu chúng ta đang nói về người dùng, bạn có ý tưởng nào về số lượng người dùng chúng ta đang nói đến trong một ngày không?

## Quy mô

- Người phỏng vấn: Vâng, trong một ngày, giả sử chúng ta muốn hỗ trợ một triệu người dùng hoạt động trong một ngày.
- Ứng viên: Okay, vậy là một triệu DAU (Daily Active Users). Tốt.
- Ứng viên: Tôi sẽ thực hiện một vài ước tính ở đây khi chúng ta đang nói về điều này. Điều này cho tôi ý tưởng về cách tôi sẽ lưu trữ mọi thứ. Chúng ta đã nói tối đa cho video là khoảng một phút. Tôi sẽ đưa ra một giả định nhanh và nói rằng một phút video H.264 nén là khoảng năm megabyte. Nghe có hợp lý không?
- Người phỏng vấn: Tôi nghĩ nghe hợp lý.
- Ứng viên: Có thể chúng ta nói mỗi người dùng upload hai video mỗi ngày. Vậy là 10 megabyte mỗi ngày mỗi người dùng.
- Ứng viên: Tôi sẽ không đi quá sâu vào điều này. Tôi chỉ muốn có một ý tưởng sơ bộ về phần lớn ở đây, đó là video. Phần còn lại — metadata người dùng — sẽ không đáng kể. Tôi nghĩ nó sẽ là 1 KB mỗi người dùng mỗi ngày.
- Ứng viên: Tôi nghĩ đó là ước tính khá tốt.
- Ứng viên: Tốt. Với tất cả những điều đó, có điều gì bạn thấy tôi còn thiếu không? Đây có vẻ như là tổng quan sơ bộ tốt về hệ thống chúng ta đang cố giải quyết không?
- Người phỏng vấn: Vâng, đây là tổng quan tốt. Tôi nghĩ chúng ta có thể bắt đầu đi sâu vào rồi.

## Thiết kế

- Ứng viên: Okay. Tôi sẽ bắt đầu với một vài API endpoint, chỉ để hình dung ra vấn đề. Tôi nghĩ tôi muốn bắt đầu với upload video.
- Ứng viên: Nếu tôi nói về schema cơ sở dữ liệu hỗ trợ điều đó — và tôi sẽ không đi quá nhiều vào các tham số của nó — thực ra object người dùng của chúng ta sẽ đại loại như: chúng ta sẽ có một loại user ID nào đó, và đó sẽ là một UID.
- Ứng viên: Chúng ta sẽ có một loại video link nào đó. Thực ra, tôi sẽ nói về điều đó sau, nhưng sau khi upload video, chúng ta sẽ muốn lưu nó trong một loại blob storage nào đó, như S3. Đây sẽ là một link đầy đủ đến object đó, vì vậy đây sẽ là một URL.
- Ứng viên: Rồi có thể là metadata. Đây chỉ là dữ liệu dạng string. Đó là endpoint đầu tiên tôi đang nghĩ.
- Ứng viên: Để tôi đi vào điều đó một chút. Tôi sẽ không đi vào nhiều chi tiết về người dùng ở đây, vì tôi nghĩ đó là vấn đề đã có giải pháp sẵn. Chúng ta có thể xem xét đến điều đó nếu còn thời gian, nhưng trong phạm vi này, tôi sẽ không nói quá nhiều về nó.
- Ứng viên: Tôi chỉ dành một phút để suy nghĩ qua điều này.
- Ứng viên: Okay, tốt. Rõ ràng chúng ta sẽ muốn có một loại cơ sở dữ liệu nào đó để hỗ trợ điều này. Đây là nơi chúng ta sẽ lưu bảng này. Tôi giả định, bây giờ, đây sẽ là cơ sở dữ liệu quan hệ (relational database) — Postgres, hoặc bất kỳ loại relational database nào bạn chọn.
- Ứng viên: Upload video sẽ gửi object này đến cơ sở dữ liệu quan hệ.
- Người phỏng vấn: Bạn có thể nói ngắn gọn về sự khác biệt giữa cơ sở dữ liệu quan hệ và loại cơ sở dữ liệu khác, và tại sao chúng ta có thể muốn dùng loại này không?
- Ứng viên: Vâng. Cơ sở dữ liệu quan hệ so với cơ sở dữ liệu NoSQL, chẳng hạn: cơ sở dữ liệu quan hệ sẽ có cấu trúc hơn một chút. Thông thường, bạn dùng cơ sở dữ liệu quan hệ cho những thứ như object dữ liệu người dùng, liên kết các bảng khác nhau với nhau.
- Ứng viên: Ví dụ, bạn có thể có một người dùng duy nhất có nhiều video. Bạn sẽ có nhiều video object, và những thứ đó có thể được lưu trong hai bảng khác nhau. Bạn có thể thực hiện các truy vấn SQL với chúng.
- Ứng viên: Cơ sở dữ liệu NoSQL thực sự tốt cho dữ liệu không có cấu trúc, như log data, những thứ như vậy. Chúng linh hoạt hơn về bản chất, không có cấu trúc cứng nhắc theo nghĩa bạn sẽ truy vấn dữ liệu đó và thực hiện nhiều join. Bạn có nhiều khả năng tìm kiếm tự do các dữ liệu key-value trong đó.
- Ứng viên: Trong trường hợp này, cơ sở dữ liệu quan hệ có thể nghiêm ngặt hơn nhiều, nhưng nó cũng có thể hiệu quả hơn về không gian và tốc độ cho các truy vấn cụ thể. Tôi nghĩ điều đó hợp lý ở đây.
- Ứng viên: Những gì chúng ta làm là upload video object lên cơ sở dữ liệu này. Thực ra, thay vào đó, đây chỉ là dữ liệu video. Cách tốt nhất để mô tả điều này là bảng video.
- Ứng viên: Điều này sẽ gửi đến bảng video. Ý tưởng ở đây là đây chỉ là dữ liệu, vì điều chúng ta muốn làm sau đó là gửi object video thực sự đến một loại cloud bucket nào đó, như tôi đề cập trước. Như S3, chỉ dùng cloud này, một blob store.
- Ứng viên: Bản thân video thực sự tồn tại ở đây, và rồi trong bảng này chúng ta có link đến nó.
- Ứng viên: Chúng ta sẽ chạy một POST đến endpoint upload video này. Đây sẽ là video của tôi cộng với thông tin người dùng của tôi.
- Ứng viên: Endpoint upload video chấp nhận video và thông tin người dùng. Chúng ta lưu nó vào bảng, upload lên blob storage, rồi trả về một loại phản hồi 200 nào đó, đó là những gì API sẽ phản hồi cho ứng dụng, nói rằng video đã được xử lý thành công.
- Ứng viên: Điều đó xử lý xong phần upload của chúng ta. Phần upload khá đơn giản. Có câu hỏi nào về điều đó, hoặc bạn nghĩ tôi bỏ sót điều gì không?
- Người phỏng vấn: Không, tôi nghĩ điều đó rất hợp lý. Chúng ta có tổng quan về nơi video đi, nơi metadata đi, và cách ứng dụng thực hiện yêu cầu đó. Tôi nghĩ điều đó hợp lý.
- Ứng viên: Tuyệt, tốt.
- Ứng viên: Hãy nói rất nhanh về xem feed. Đây sẽ là một endpoint tương tự, view feed, và thực ra đây sẽ là một GET request.
- Ứng viên: Khi bạn mở ứng dụng, tôi nghĩ, chúng ta có muốn load nội dung này ngay khi ứng dụng mở không? Tôi đoán chúng ta muốn bắt đầu pre-load càng nhiều càng tốt trước để người dùng không phải đợi quá lâu để video tải, đúng không?
- Người phỏng vấn: Vâng, tôi nghĩ chúng ta sẽ muốn làm điều đó trong chừng mực nó cho phép chúng ta xem video nhanh hơn, nhưng không đến mức tiêu tốn quá nhiều băng thông của người dùng và những thứ như vậy.
- Ứng viên: Vâng. Tôi nghĩ có lẽ 3 video đầu tiên — bất kể chúng là gì — chúng ta sẽ muốn lấy những video đó càng nhanh càng tốt.
- Ứng viên: Lý do tôi hỏi điều đó là tôi nghĩ sẽ có ý nghĩa khi có một Redis cache ở đây, một loại cache nào đó. Ý tưởng ở đây là chúng ta thực sự preload một danh sách 10 video hàng đầu mà chúng ta sẽ load cho người dùng trước khi họ đến trang view feed.
- Ứng viên: Nếu một người dùng với UUID cụ thể nhấn vào view feed, chúng ta đến cache đã được build sẵn này và lấy những video hàng đầu đã được chọn trước.
- Ứng viên: Ví dụ, UUID này sẽ trả về 10 link video liên quan đến user ID đó và các link cho blob storage. Sau đó ứng dụng sẽ lấy chúng từ blob store ngay lập tức. Nghe có hợp lý không?
- Người phỏng vấn: Vâng, nghe hợp lý. Điều đó thực sự thú vị. Bạn có thể nói thêm một chút về cách cache hoạt động không?
- Ứng viên: Vâng. Tôi đang nghĩ về một service chạy trong nền ở đây. Đây sẽ là một pre-cache service. Nó sẽ chạy theo lịch trình, nhưng cũng có thể theo yêu cầu.
- Ứng viên: Những gì nó sẽ làm là biên soạn các playlist cho người dùng và pre-cache chúng. Nó có thể dựa trên thời điểm người dùng thực sự đến và thực hiện GET request, để chúng ta preload cái tiếp theo, hoặc chúng ta chỉ làm nó trong nền. Có một vài chiến lược chúng ta có thể dùng ở đó.
- Ứng viên: Điều tôi đang cố tránh là phụ thuộc quá nhiều vào việc làm điều này tại thời điểm request, vì từ những gì tôi có thể thấy, hệ thống này có vẻ rất read-heavy. Sẽ có rất nhiều hoạt động đọc.
- Ứng viên: Ngoài việc có cơ sở dữ liệu chính này — tôi sẽ đến phần scaling sau — tôi nghĩ đối với cơ sở dữ liệu chính này chúng ta cũng muốn có một loại read worker nào đó, đó sẽ là cơ sở dữ liệu read-only.
- Ứng viên: Lý do là chúng ta không muốn tạo quá nhiều tải trên cơ sở dữ liệu duy nhất đang nhận các upload này. Chúng ta muốn có thứ gì đó quản lý các lần đọc.
- Ứng viên: Thực ra, tôi sẽ làm điều gì đó như thế này: secondary kéo từ primary, và nó được dùng chỉ cho đọc. Nó build pre-cache, nạp cache, và rồi khi view feed được nhấn, nó tải ngay lập tức. Ít nhất là query thì vậy.
- Ứng viên: Nghe có hợp lý không?
- Người phỏng vấn: Vâng, nghe rất hợp lý.
- Người phỏng vấn: Quay lại một trong những câu hỏi đầu tiên về độ trễ, bạn có thể nói một chút về cách việc giới thiệu cache này sẽ ảnh hưởng đến độ trễ trong hệ thống và việc thấy các cập nhật, v.v. không?
- Ứng viên: Vâng, chắc chắn rồi. Một điều chúng ta cần xem xét là chúng ta muốn cập nhật nhanh đến mức nào. Nếu tôi upload một video, tôi không biết liệu video tôi upload có xuất hiện trong feed của tôi không, và nếu có, bao lâu thì thấy.
- Ứng viên: Feed này về cơ bản là một danh sách video được tuyển chọn. Vì tôi biết TikTok có một thuật toán đặc biệt họ dùng để điền vào feed của bạn, tôi đang cố loại bỏ tất cả những điều đó xảy ra tại thời điểm GET, tại thời điểm tải ứng dụng.
- Ứng viên: Tôi đang cố có nó được build sẵn, để ngay lập tức chúng ta có được những gì chúng ta cần từ back-end và không phải đợi một service nào đó biên soạn điều đó trong thời gian thực.
- Ứng viên: Điều này cũng giải quyết một chút vấn đề scaling của chúng ta. Nếu bạn hình dung TikTok có một triệu người dùng, điều gì sẽ xảy ra nếu một triệu người dùng cùng lúc vào và chạy cùng một query? Chúng ta thực sự có thể làm treo cơ sở dữ liệu vì chúng ta đang chạy tất cả các query này cùng một lúc. Chúng ta cũng có thể tăng độ trễ đó.
- Ứng viên: Bạn có thể giải quyết điều đó với auto-scaling groups, nhưng ngay cả auto-scaling groups cũng mất thời gian để khởi động. Đó là điều tôi đang nghĩ đến ở đây.
- Ứng viên: Điều quan trọng thực sự là tôi nhận thấy hệ thống này có vẻ rất read-heavy, vì vậy tôi đang cố đến điểm mà những lần đọc đó được quản lý riêng.
- Người phỏng vấn: Vâng, tôi nghĩ đó là nhận thức rất hay.
- Ứng viên: Tốt. Tôi nghĩ điều đó xử lý xong phần view feed cho hầu hết. Tôi cảm thấy khá ổn với điều đó.
- Ứng viên: Phần cuối cùng ở đây sẽ là yêu thích video. Tôi nghĩ chúng ta sẽ chỉ có thêm một endpoint nữa ở đây.
- Ứng viên: Đây sẽ là — tôi sẽ gọi cái này là user activity có lẽ, hoặc gì đó như vậy. Điều đó hơi chung chung, nhưng tôi sẽ nhanh qua cái này. Chúng ta đã hơi dài về mặt thời gian. Trong thế giới thực, tôi sẽ cố đặt tên nó tốt hơn, mô tả hơn về những gì nó thực sự làm.
- Ứng viên: Ý tưởng ở đây là khi tôi nhấn user activity, đây là follow, thích video, những thứ như vậy.
- Ứng viên: Ý tưởng đằng sau user activity là nó thực sự chỉ sẽ nhấn vào cơ sở dữ liệu này. Tôi sẽ có một bảng khác ở đây, một loại bảng followers hoặc bảng user activity nào đó.
- Ứng viên: Bảng này sẽ trông đại loại như vẫn có một user ID và một UUID.
- Ứng viên: Tôi nghĩ đây sẽ là bảng followers hoặc user activity. Chúng ta sẽ cần một vài khóa ở đây. Following sẽ phải là một foreign key đến bảng khác, vì đối với bất kỳ một người dùng nào, chúng ta rõ ràng sẽ follow nhiều tài khoản khác.
- Ứng viên: Chúng ta cần một bảng khác có danh sách các user ID mà tôi đang follow, tài khoản người dùng.
- Ứng viên: Ngoài ra, chúng ta muốn likes. Chúng ta muốn lưu một foreign key khác đến bảng videos. Tôi giả định nếu mỗi tài khoản có một bảng video, chúng ta có thể sẽ muốn có một video UUID, như một video ID. Đây sẽ là trường UID để tôi có thể key đến video ID này và nói rằng đây là danh sách các like tôi đang thích.
- Ứng viên: Tất cả điều này sau đó feed vào pre-cache service algorithm, tôi sẽ không đi vào đó, nhưng tôi nghĩ điều đó quan trọng để lưu trữ.
- Ứng viên: Về cơ bản, bất kỳ hoạt động nào tôi có, tất cả hoạt động người dùng này sẽ nhấn vào cơ sở dữ liệu và thêm điều đó vào bảng. Tôi hiện đang follow người dùng này, tôi đang thích video này, v.v.
- Ứng viên: Nếu tôi cần chạy một GET request — mà nghe có vẻ pre-cache service thực sự sẽ cần chạy — nó sẽ chạy một request nào đó với user activity, hoặc có thể chúng ta có một service nội bộ quản lý điều đó. Tôi chưa chắc.
- Ứng viên: Tôi sẽ có một API trả về tất cả các like và người follow của người dùng, về cơ bản. Có thể đó là một GET request từ user activity. Đó là ý tưởng sơ bộ của tôi về điều đó. Nghe có hợp lý từ góc độ luồng xử lý không?
- Người phỏng vấn: Vâng, nghe hợp lý.

## Câu hỏi follow-up

- Người phỏng vấn: Tuyệt vời. Tôi nghĩ chúng ta đã có các tương tác chính ở đây. Chúng ta đã có hầu hết các tính năng được xây dựng về mặt cấu trúc. Tôi tò mò như một follow-up: bạn nghĩ điểm nghẽn cổ chai (bottleneck) của hệ thống sẽ là gì nếu, ví dụ, lưu lượng truy cập tăng 10 lần vào một ngày nào đó, hoặc điều gì đó như vậy, để thực sự scale mọi thứ lên?
- Ứng viên: Vâng, chắc chắn rồi.
- Ứng viên: Điều đầu tiên tôi phải nghĩ đến là các region. Nếu chúng ta đang nghĩ đến việc có nhiều phiên bản của điều này trong các trung tâm dữ liệu khu vực, chúng ta có thể muốn xem xét việc geolocation.
- Ứng viên: Xu hướng đầu tiên của tôi là bất kỳ người dùng nào chúng ta sẽ đặt, người dùng nên đứng sau một loại CDN nào đó. Về cơ bản, tất cả các API endpoint này sẽ muốn đứng sau một loại mạng phân phối nội dung (content delivery network) nào đó, như Akamai hoặc gì đó như vậy.
- Ứng viên: Ngay khi chúng ta lấy một video — ví dụ, hãy nói trong nhiều tình huống khi chúng ta thực sự tăng lưu lượng 10 lần, thường là trong các kịch bản xung quanh ai đó nổi tiếng gửi ra một video. Họ có 10 triệu người follow, và tất cả mọi người đều muốn xem video đó.
- Ứng viên: Ý tưởng đằng sau CDN là ngay khi người đầu tiên lấy nó, CDN cache nó cục bộ trên hệ thống CDN, vì vậy tất cả người dùng đang lấy nó chỉ đang lấy từ CDN.
- Ứng viên: CDN đang định tuyến đến node cục bộ gần nhất, vì vậy lưu lượng internet không phải luôn luôn nhấn vào hệ thống của tôi hoặc blob storage của tôi. Nó chỉ nhấn vào CDN. Điều đó sort of đứng trước nó.
- Ứng viên: Rõ ràng những video này tương đối lớn. Ở quy mô, khi chúng ta đang nói về 10 triệu người dùng nhân với năm megabyte mỗi video, đó là một con số đáng kể để xử lý. Đặt CDN trước điều đó là quan trọng.
- Ứng viên: Tôi nghĩ việc có một load balancer trước các API endpoint này cũng sẽ làm một vài điều. Đầu tiên, nó sẽ cho phép tôi cam kết với yêu cầu phi chức năng tính sẵn sàng cao này, vì các API endpoint này có thể scalable và chúng ta có thể làm những thứ như có nhiều deployment, nhiều service đang chạy.
- Ứng viên: Load balancer đang chọn một trong các service này có sẵn tại bất kỳ thời điểm nào và định tuyến lưu lượng truy cập cho phù hợp. A hoặc B, chẳng hạn.
- Ứng viên: Không chỉ cân bằng giữa hai, mà còn cho phép bạn làm những thứ như zero-downtime deployment. Nếu chúng ta phải cập nhật phần mềm back-end chạy điều này, chúng ta sẽ chuyển tất cả lưu lượng sang B và chỉ cho phép B phục vụ lưu lượng trong khi A đang tắt và nhận cập nhật.
- Ứng viên: A sang B là một cái nhìn rất đơn giản. Đó có thể là hàng trăm compute instance, nhưng đó là ý tưởng.
- Ứng viên: Đó là nơi tôi thấy bottleneck. Như tôi đã nói, cơ sở dữ liệu luôn là bottleneck. Chúng ta chắc chắn sẽ có một cơ sở dữ liệu write chính với các read-only worker quản lý các GET request. Những cái này cũng sẽ nằm trong một loại auto-scaling group nào đó, vì vậy chúng ta có thể scale chúng lên khi cần.
- Ứng viên: Tương tự với pre-cache service. Một khi chúng ta đi vào chi tiết hơn về những gì chúng ta cần, và thời gian và yêu cầu chúng ta cần cho pre-cache service, chúng ta sẽ có sự hiểu biết khá tốt.
- Ứng viên: Tôi không biết pre-cache service sẽ cần auto-scale đến mức nào. Nó có thể chỉ có thể được thiết lập ổn định hoặc tương đương gần đúng với nhu cầu đã biết trước.
- Ứng viên: Cache cũng tương tự. Cache khá scalable và những thứ như vậy.
- Ứng viên: Một điều cuối cùng tôi nghĩ đến là write database. Nếu chúng ta tăng lưu lượng 10 lần, chúng ta sẽ muốn xem xét một loại database sharding nào đó. Chúng ta sẽ có một loại database shard service nào đó đứng trước điều này.
- Ứng viên: Sharding service nằm trước các write. Nó giống như một load balancer cho cơ sở dữ liệu, về cơ bản. Nó chọn cơ sở dữ liệu nào nó sẽ đến dựa trên một thuật toán hoặc chiến lược sharding nào đó.
- Ứng viên: Có tất cả các loại thuật toán hoặc chiến lược sharding. Phiên bản đơn giản nhất có thể là theo region. Tất cả các request từ Mỹ đến cơ sở dữ liệu này, tất cả các request từ Anh đến cơ sở dữ liệu này. Bạn có thể làm những thứ như vậy.
- Ứng viên: Đó là cách tôi hình dung nó, vì điều đó giúp chúng ta chia tải giữa các cơ sở dữ liệu này.
- Người phỏng vấn: Vâng, tuyệt vời. Chúng ta đã đi vào một số chi tiết ở đó. Nhìn tổng thể, chúng ta đã có tất cả các phần đúng chỗ, và tôi nghĩ đây là điểm dừng khá tốt.
- Người phỏng vấn: Bạn có điều gì cuối cùng muốn thêm vào trước khi chúng ta kết thúc không?
- Ứng viên: Không. Tôi nghĩ điều duy nhất tôi có thể thêm nếu có thêm thời gian là đi sâu hơn vào pre-cache service, vì tôi nghĩ nó có thể cần cấu trúc cơ sở dữ liệu riêng gần như tách biệt và những thứ như vậy.
- Ứng viên: Nhưng như tôi đã nói, tôi không muốn đi quá sâu vào các chi tiết thuật toán đặc thù của TikTok. Tôi nghĩ chỉ cần nói rằng điều này tồn tại ở đâu đó và chúng ta sẽ dùng nó là đủ cho mục đích của cuộc phỏng vấn này.
- Ứng viên: Tôi cảm thấy khá ổn với điều đó.

## Phân tích phỏng vấn

- Người phỏng vấn: Tuyệt vời. Được rồi, hãy dừng ở đây.
- Người phỏng vấn: Tóm tắt những gì chúng ta đã đi qua: chúng ta đã nói về việc thiết kế API, cấu trúc cơ sở dữ liệu, các microservice khác nhau, load balancing, và những thứ như vậy.
- Người phỏng vấn: Nhìn chung, tôi nghĩ bạn đã làm rất tốt trong việc truyền đạt rõ ràng tất cả những ý tưởng này và cũng nhảy vào và cung cấp kiến thức thêm về các điều cụ thể.
- Người phỏng vấn: Ngay cả khi tôi hỏi một câu hỏi follow-up, hoặc thậm chí không cần hỏi, tôi cảm thấy bạn thực sự nhảy vào và thể hiện rằng bạn thành thạo tất cả những chủ đề này, điều đó thực sự tuyệt vời.
- Người phỏng vấn: Mặc dù đây là phiên bản hơi rút gọn, tôi cảm thấy bạn có thể đã đi sâu nhiều lớp hơn vào bất kỳ chủ đề nào trong số này. Điều đó thực sự cho tôi thấy rằng bạn biết mình đang nói về điều gì.
- Người phỏng vấn: Bạn nghĩ sao về tổng thể?
- Ứng viên: Vâng, tôi nghĩ luôn thú vị khi cố thiết kế thứ gì đó mà bạn chưa từng dùng. Chúng ta đang phải đưa ra một vài giả định. Biết Facebook và Instagram, tôi hiểu những thứ đó, vì vậy việc đưa ra một số giả định về cách mọi người dùng TikTok thực sự đã giúp ích.
- Ứng viên: Vâng, tôi nghĩ buổi phỏng vấn đã diễn ra tốt.
- Người phỏng vấn: Cảm ơn bạn rất nhiều, Adam, và chúc may mắn cho tất cả mọi người trong buổi phỏng vấn system design của bạn.
