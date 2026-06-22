using System.Reflection;
using EquipmentApi.Entities;
using EquipmentApi.Enums;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<EquipmentCategory> EquipmentCategories => Set<EquipmentCategory>();
    public DbSet<EquipmentModel> EquipmentModels => Set<EquipmentModel>();
    public DbSet<EquipmentAsset> EquipmentAssets => Set<EquipmentAsset>();
    public DbSet<EquipmentAssignment> EquipmentAssignments => Set<EquipmentAssignment>();
    public DbSet<EquipmentRequest> EquipmentRequests => Set<EquipmentRequest>();
    public DbSet<ApprovalStep> ApprovalSteps => Set<ApprovalStep>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        MapEnums(modelBuilder);

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("employees");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Password).HasColumnName("password");
            entity.Property(e => e.Role).HasColumnName("role").HasDefaultValue(EmployeeRole.Employee);
            entity.Property(e => e.AccountStatus).HasColumnName("account_status").HasDefaultValue(AccountStatus.Active);
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(e => e.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("departments");
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(d => d.Name).HasColumnName("name");
            entity.Property(d => d.DirectManagerId).HasColumnName("direct_manager_id");
            entity.Property(d => d.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(d => d.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(d => d.DirectManager)
                .WithMany()
                .HasForeignKey(d => d.DirectManagerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(t => t.EmployeeId).HasColumnName("employee_id");
            entity.Property(t => t.TokenHash).HasColumnName("token_hash");
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.Property(t => t.ExpiresAt).HasColumnName("expires_at");
            entity.Property(t => t.RevokedAt).HasColumnName("revoked_at");
            entity.Property(t => t.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

            entity.HasOne(t => t.Employee)
                .WithMany()
                .HasForeignKey(t => t.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(t => t.EmployeeId).HasDatabaseName("IDX_refresh_tokens_employee_id");
        });

        modelBuilder.Entity<EquipmentCategory>(entity =>
        {
            entity.ToTable("equipment_categories");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(c => c.Name).HasColumnName("name");
            entity.Property(c => c.Description).HasColumnName("description");
            entity.Property(c => c.CategoryImage).HasColumnName("category_image");
            entity.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(c => c.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<EquipmentModel>(entity =>
        {
            entity.ToTable("equipment_models");
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(m => m.Name).HasColumnName("name");
            entity.Property(m => m.CategoryId).HasColumnName("category_id");
            entity.Property(m => m.Description).HasColumnName("description");
            entity.Property(m => m.DefaultValue).HasColumnName("default_value").HasPrecision(10, 2).HasDefaultValue(0m);
            entity.Property(m => m.ProcurementYear).HasColumnName("procurement_year");
            entity.Property(m => m.ReleaseYear).HasColumnName("release_year");
            entity.Property(m => m.ExpectedLifespanMonths).HasColumnName("expected_lifespan_months");
            entity.Property(m => m.LowStockThreshold).HasColumnName("low_stock_threshold").HasDefaultValue(1);
            entity.Property(m => m.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(m => m.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(m => m.Category)
                .WithMany(c => c.Models)
                .HasForeignKey(m => m.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EquipmentAsset>(entity =>
        {
            entity.ToTable("equipment_assets");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(a => a.EquipmentModelId).HasColumnName("equipment_model_id");
            entity.Property(a => a.AssetTag).HasColumnName("asset_tag");
            entity.HasIndex(a => a.AssetTag).IsUnique();
            entity.Property(a => a.SerialNumber).HasColumnName("serial_number");
            entity.Property(a => a.Status).HasColumnName("status").HasDefaultValue(EquipmentAssetStatus.Available);
            entity.Property(a => a.AssignedEmployeeId).HasColumnName("assigned_employee_id");
            entity.Property(a => a.AssignedAt).HasColumnName("assigned_at");
            entity.Property(a => a.ExpectedReturnDate).HasColumnName("expected_return_date");
            entity.Property(a => a.Notes).HasColumnName("notes");
            entity.Property(a => a.RetiredAt).HasColumnName("retired_at");
            entity.Property(a => a.RetiredById).HasColumnName("retired_by_id");
            entity.Property(a => a.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(a => a.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(a => a.EquipmentModel)
                .WithMany(m => m.Assets)
                .HasForeignKey(a => a.EquipmentModelId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.AssignedEmployee)
                .WithMany(e => e.AssignedAssets)
                .HasForeignKey(a => a.AssignedEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(a => a.RetiredBy)
                .WithMany()
                .HasForeignKey(a => a.RetiredById)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(a => new { a.EquipmentModelId, a.Status })
                .HasDatabaseName("IDX_equipment_assets_model_status");
        });

        modelBuilder.Entity<EquipmentRequest>(entity =>
        {
            entity.ToTable("equipment_requests");
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(r => r.RequesterId).HasColumnName("requester_id");
            entity.Property(r => r.RequestType).HasColumnName("request_type");
            entity.Property(r => r.EquipmentModelId).HasColumnName("equipment_model_id");
            entity.Property(r => r.RequestedItemName).HasColumnName("requested_item_name");
            entity.Property(r => r.CategoryId).HasColumnName("category_id");
            entity.Property(r => r.Quantity).HasColumnName("quantity").HasDefaultValue(1);
            entity.Property(r => r.StartDate).HasColumnName("start_date");
            entity.Property(r => r.EndDate).HasColumnName("end_date");
            entity.Property(r => r.Purpose).HasColumnName("purpose");
            entity.Property(r => r.Status).HasColumnName("status").HasDefaultValue(RequestStatus.PendingManagerApproval);
            entity.Property(r => r.CancellationReason).HasColumnName("cancellation_reason");
            entity.Property(r => r.CancelledAt).HasColumnName("cancelled_at");
            entity.Property(r => r.RejectedReason).HasColumnName("rejected_reason");
            entity.Property(r => r.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(r => r.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(r => r.Requester)
                .WithMany()
                .HasForeignKey(r => r.RequesterId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.EquipmentModel)
                .WithMany()
                .HasForeignKey(r => r.EquipmentModelId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(r => r.Category)
                .WithMany()
                .HasForeignKey(r => r.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(r => r.Status).HasDatabaseName("IDX_equipment_requests_status");
        });

        modelBuilder.Entity<ApprovalStep>(entity =>
        {
            entity.ToTable("approval_steps");
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(s => s.RequestId).HasColumnName("request_id");
            entity.Property(s => s.Level).HasColumnName("level");
            entity.Property(s => s.ApproverId).HasColumnName("approver_id");
            entity.Property(s => s.ApproverRole).HasColumnName("approver_role");
            entity.Property(s => s.Status).HasColumnName("status").HasDefaultValue(ApprovalStepStatus.Pending);
            entity.Property(s => s.Comment).HasColumnName("comment");
            entity.Property(s => s.ActedAt).HasColumnName("acted_at");
            entity.Property(s => s.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(s => s.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(s => s.Request)
                .WithMany(r => r.ApprovalSteps)
                .HasForeignKey(s => s.RequestId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(s => s.Approver)
                .WithMany()
                .HasForeignKey(s => s.ApproverId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(s => new { s.ApproverId, s.Status })
                .HasDatabaseName("IDX_approval_steps_approver_status");
            entity.HasIndex(s => new { s.RequestId, s.Level })
                .HasDatabaseName("IDX_approval_steps_request_level");
        });

        modelBuilder.Entity<EquipmentAssignment>(entity =>
        {
            entity.ToTable("equipment_assignments");
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(a => a.EquipmentAssetId).HasColumnName("equipment_asset_id");
            entity.Property(a => a.EmployeeId).HasColumnName("employee_id");
            entity.Property(a => a.RequestId).HasColumnName("request_id");
            entity.Property(a => a.AssignedById).HasColumnName("assigned_by_id");
            entity.Property(a => a.AssignedAt).HasColumnName("assigned_at");
            entity.Property(a => a.ExpectedReturnDate).HasColumnName("expected_return_date");
            entity.Property(a => a.ReturnRequestedById).HasColumnName("return_requested_by_id");
            entity.Property(a => a.ReturnRequestedAt).HasColumnName("return_requested_at");
            entity.Property(a => a.ReturnByDate).HasColumnName("return_by_date");
            entity.Property(a => a.ReturnedAt).HasColumnName("returned_at");
            entity.Property(a => a.ReturnNote).HasColumnName("return_note");
            entity.Property(a => a.Status).HasColumnName("status").HasDefaultValue(EquipmentAssignmentStatus.Active);
            entity.Property(a => a.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(a => a.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(a => a.EquipmentAsset)
                .WithMany(asset => asset.Assignments)
                .HasForeignKey(a => a.EquipmentAssetId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(a => a.Employee)
                .WithMany(e => e.Assignments)
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.Request)
                .WithMany(r => r.Assignments)
                .HasForeignKey(a => a.RequestId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(a => a.AssignedBy)
                .WithMany()
                .HasForeignKey(a => a.AssignedById)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(a => a.ReturnRequestedBy)
                .WithMany()
                .HasForeignKey(a => a.ReturnRequestedById)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Id).HasColumnName("id").HasDefaultValueSql("uuid_generate_v4()");
            entity.Property(n => n.RecipientId).HasColumnName("recipient_id");
            entity.Property(n => n.Type).HasColumnName("type");
            entity.Property(n => n.Title).HasColumnName("title");
            entity.Property(n => n.Message).HasColumnName("message");
            entity.Property(n => n.IsRead).HasColumnName("is_read").HasDefaultValue(false);
            entity.Property(n => n.ReadAt).HasColumnName("read_at");
            entity.Property(n => n.RequestId).HasColumnName("request_id");
            entity.Property(n => n.ApprovalStepId).HasColumnName("approval_step_id");
            entity.Property(n => n.EquipmentAssignmentId).HasColumnName("equipment_assignment_id");
            entity.Property(n => n.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(n => n.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

            entity.HasOne(n => n.Recipient)
                .WithMany(e => e.Notifications)
                .HasForeignKey(n => n.RecipientId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(n => n.Request)
                .WithMany()
                .HasForeignKey(n => n.RequestId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(n => n.ApprovalStep)
                .WithMany()
                .HasForeignKey(n => n.ApprovalStepId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(n => n.EquipmentAssignment)
                .WithMany()
                .HasForeignKey(n => n.EquipmentAssignmentId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(n => new { n.RecipientId, n.IsRead })
                .HasDatabaseName("IDX_notifications_recipient_read");
        });
    }

    public override int SaveChanges()
    {
        UpdateTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        UpdateTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void UpdateTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Properties.Any(p => p.Metadata.Name == "CreatedAt"))
                {
                    entry.Property("CreatedAt").CurrentValue = now;
                }
            }

            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                if (entry.Properties.Any(p => p.Metadata.Name == "UpdatedAt"))
                {
                    entry.Property("UpdatedAt").CurrentValue = now;
                }
            }
        }
    }

    private static void MapEnums(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresEnum<EmployeeRole>("employee_role_enum");
        modelBuilder.HasPostgresEnum<AccountStatus>("account_status_enum");
        modelBuilder.HasPostgresEnum<EquipmentAssetStatus>("equipment_asset_status_enum");
        modelBuilder.HasPostgresEnum<RequestType>("request_type_enum");
        modelBuilder.HasPostgresEnum<RequestStatus>("request_status_enum");
        modelBuilder.HasPostgresEnum<ApprovalRole>("approval_role_enum");
        modelBuilder.HasPostgresEnum<ApprovalStepStatus>("approval_step_status_enum");
        modelBuilder.HasPostgresEnum<EquipmentAssignmentStatus>("equipment_assignment_status_enum");
        modelBuilder.HasPostgresEnum<NotificationType>("notification_type_enum");
    }
}
