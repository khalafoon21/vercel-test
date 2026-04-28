// Vercel-safe in-memory DB mock with demo data
const demoData = {
    users: [
        { id: 1, first_name: 'أحمد', last_name: 'محمد', email: 'admin@test.com', role: 'admin', password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', seller_status: 'approved' },
        { id: 2, first_name: 'سعيد', last_name: 'علي', email: 'seller@test.com', role: 'seller', seller_status: 'approved' },
        { id: 3, first_name: 'عمرو', last_name: 'خالد', email: 'user@test.com', role: 'user' }
    ],
    categories: [
        { id: 1, name: 'إلكترونيات', icon: 'fa-laptop' },
        { id: 2, name: 'ملابس', icon: 'fa-tshirt' },
        { id: 3, name: 'أحذية', icon: 'fa-shoe-prints' }
    ],
    products: [
        { 
            id
