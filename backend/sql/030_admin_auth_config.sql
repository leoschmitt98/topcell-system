IF OBJECT_ID('dbo.admin_auth_config', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.admin_auth_config (
    id INT NOT NULL PRIMARY KEY,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  );
END;
