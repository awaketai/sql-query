-- Small table: Categories (10 rows)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, description) VALUES
    ('Electronics', 'Electronic devices and accessories'),
    ('Clothing', 'Apparel and fashion items'),
    ('Books', 'Books and publications'),
    ('Home & Garden', 'Home decoration and gardening tools'),
    ('Sports', 'Sports equipment and accessories'),
    ('Toys', 'Toys and games for all ages'),
    ('Food', 'Food and beverages'),
    ('Health', 'Health and personal care products'),
    ('Automotive', 'Car parts and accessories'),
    ('Office', 'Office supplies and equipment');

-- Medium table: Users (1000 rows)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Generate 1000 users using generate_series
INSERT INTO users (username, email, full_name, status, balance, created_at, last_login)
SELECT
    'user_' || i,
    'user_' || i || '@example.com',
    CASE (i % 10)
        WHEN 0 THEN '张三'
        WHEN 1 THEN '李四'
        WHEN 2 THEN '王五'
        WHEN 3 THEN '赵六'
        WHEN 4 THEN '钱七'
        WHEN 5 THEN '孙八'
        WHEN 6 THEN '周九'
        WHEN 7 THEN '吴十'
        WHEN 8 THEN '郑十一'
        ELSE '陈十二'
    END,
    CASE
        WHEN i % 20 = 0 THEN 'inactive'
        WHEN i % 50 = 0 THEN 'suspended'
        ELSE 'active'
    END,
    (random() * 10000)::DECIMAL(10, 2),
    CURRENT_TIMESTAMP - (random() * 365 || ' days')::interval,
    CASE
        WHEN i % 10 = 0 THEN NULL
        ELSE CURRENT_TIMESTAMP - (random() * 30 || ' days')::interval
    END
FROM generate_series(1, 1000) AS i;

-- Large table: Orders (100,000 rows)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    order_no VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'pending',
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_category_id ON orders(category_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Generate 100,000 orders
INSERT INTO orders (user_id, category_id, order_no, amount, quantity, status, shipping_address, created_at, updated_at)
SELECT
    (random() * 999 + 1)::INTEGER,
    (random() * 9 + 1)::INTEGER,
    'ORD-' || to_char(i, 'FM000000'),
    (random() * 5000 + 10)::DECIMAL(12, 2),
    (random() * 10 + 1)::INTEGER,
    CASE (i % 5)
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'paid'
        WHEN 2 THEN 'shipped'
        WHEN 3 THEN 'delivered'
        ELSE 'cancelled'
    END,
    CASE (i % 3)
        WHEN 0 THEN '北京市朝阳区xxx街道xxx号'
        WHEN 1 THEN '上海市浦东新区xxx路xxx号'
        ELSE '广州市天河区xxx大道xxx号'
    END,
    CURRENT_TIMESTAMP - (random() * 365 || ' days')::interval,
    CURRENT_TIMESTAMP - (random() * 30 || ' days')::interval
FROM generate_series(1, 100000) AS i;

-- Add some views for testing
CREATE VIEW active_users AS
SELECT id, username, email, full_name, balance, last_login
FROM users
WHERE status = 'active'
ORDER BY balance DESC;

CREATE VIEW order_summary AS
SELECT
    c.name AS category_name,
    COUNT(*) AS total_orders,
    SUM(o.amount) AS total_amount,
    AVG(o.amount) AS avg_amount,
    SUM(o.quantity) AS total_quantity
FROM orders o
JOIN categories c ON o.category_id = c.id
GROUP BY c.id, c.name
ORDER BY total_amount DESC;

-- Analyze tables for better query planning
ANALYZE categories;
ANALYZE users;
ANALYZE orders;
