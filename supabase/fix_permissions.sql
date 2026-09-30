-- 1. Sửa lỗi phân quyền (Permission Denied) sau khi xóa và tạo lại Schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- 2. Cấp quyền quản trị viên (Admin) cho tài khoản của bạn
-- Thay thế 'email-cua-ban@gmail.com' bằng email bạn dùng để đăng ký/đăng nhập
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'email-cua-ban@gmail.com';
