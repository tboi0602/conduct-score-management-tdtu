# RDM rút gọn thuộc tính

Sinh từ schema Prisma: **26 bảng, 45 khóa ngoại**. Giữ tất cả PK/FK, kể cả người thao tác và tự tham chiếu; giữ các cột tham gia unique tổ hợp. Không chỉnh các ảnh ERD của người dùng.

- [SVG](RDM-Essential.svg)
- [Mermaid](RDM-Essential.mmd)

Mũi tên đi từ FK tới khóa được tham chiếu. Di chuột lên cột/đường để xem đích. F01… là số tham chiếu, không phải tên cột. Dấu ? nghĩa là nullable, không thuộc tên cột. UserRole có PK ghép (userId, roleId).

Outbox aggregateId không phải FK. Schedule, FreeTime, RolePermission, UserRole và ConductScoreCriterionTotal đều là bảng riêng trong RDM.

Bản này lược thuộc tính để dễ đọc; không phải bản DDL đầy đủ. Các ràng buộc unique tổ hợp hiển thị dưới bảng trên SVG; Mermaid chỉ thể hiện unique một cột.

| Bảng | Cột được lược |
| --- | --- |
| faculties | createdAt, updatedAt |
| majors | createdAt, updatedAt |
| classes | createdAt, updatedAt |
| attendance_records | createdAt |
| attendance_sessions | centerLatitude, centerLongitude, centerAccuracyMeters, openedAt, closedAt, createdAt, updatedAt |
| attendance_scan_requests | latitude, longitude, accuracyMeters, correlationId, processedAt, createdAt, updatedAt |
| outbox_events | payload, correlationId, attempts, nextAttemptAt, lastError, createdAt, updatedAt |
| permissions | description, createdAt, updatedAt |
| roles | createdAt, updatedAt |
| role_permissions | Không |
| user_roles | Không |
| users | googleSubject, password, createdAt, updatedAt |
| semesters | createdAt, updatedAt |
| conduct_scores | finalizedAt, createdAt, updatedAt |
| conduct_score_entries | createdAt |
| conduct_score_criterion_totals | updatedAt |
| conduct_score_status_history | createdAt |
| organizing_units | createdAt, updatedAt |
| criteria | createdAt, updatedAt |
| events | description, descriptionPreview, type, attendanceRadiusMeters, registeredCount, createdAt, updatedAt |
| event_registrations | createdAt, updatedAt |
| notifications | createdAt |
| class_sessions | Không |
| schedules | Không |
| free_times | Không |
| students | phone, address, dateOfBirth, createdAt, updatedAt |

Sinh lại: `node Docs/ERD/generate-rdm-summary.mjs`.
