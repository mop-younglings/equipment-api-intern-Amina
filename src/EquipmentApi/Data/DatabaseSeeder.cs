using EquipmentApi.Entities;
using EquipmentApi.Enums;
using Microsoft.EntityFrameworkCore;

namespace EquipmentApi.Data;

public static class DatabaseSeeder
{
    private const string DemoPassword = "password123";
    private const int SaltRounds = 10;

    public static async Task RunAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (await db.Employees.AnyAsync(e => e.Email == "bob.manager@ministryofprogramming.com", cancellationToken))
        {
            Console.WriteLine("Demo seed skipped: demo data already exists.");
            return;
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(DemoPassword, SaltRounds);
        var now = DateTime.UtcNow;

        db.Employees.Add(new Employee
        {
            FirstName = "Admin",
            LastName = "User",
            Email = "admin@ministryofprogramming.com",
            Password = passwordHash,
            Role = EmployeeRole.Admin,
            AccountStatus = AccountStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        });

        var procurementManager = new Employee
        {
            FirstName = "Pat",
            LastName = "Procurement",
            Email = "pat.procurement@ministryofprogramming.com",
            Password = passwordHash,
            Role = EmployeeRole.ProcurementManager,
            AccountStatus = AccountStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Employees.Add(procurementManager);

        var bob = new Employee
        {
            FirstName = "Bob",
            LastName = "Manager",
            Email = "bob.manager@ministryofprogramming.com",
            Password = passwordHash,
            Role = EmployeeRole.DirectManager,
            AccountStatus = AccountStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Employees.Add(bob);
        await db.SaveChangesAsync(cancellationToken);

        var engineering = new Department { Name = "Engineering", DirectManagerId = bob.Id, CreatedAt = now, UpdatedAt = now };
        var design = new Department { Name = "Design", DirectManagerId = bob.Id, CreatedAt = now, UpdatedAt = now };
        var operations = new Department { Name = "Operations", CreatedAt = now, UpdatedAt = now };
        db.Departments.AddRange(engineering, design, operations);
        await db.SaveChangesAsync(cancellationToken);

        var jane = new Employee
        {
            FirstName = "Jane",
            LastName = "Doe",
            Email = "jane.doe@ministryofprogramming.com",
            Password = passwordHash,
            Role = EmployeeRole.Employee,
            AccountStatus = AccountStatus.Active,
            DepartmentId = engineering.Id,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var john = new Employee
        {
            FirstName = "John",
            LastName = "Smith",
            Email = "john.smith@ministryofprogramming.com",
            Password = passwordHash,
            Role = EmployeeRole.Employee,
            AccountStatus = AccountStatus.Active,
            DepartmentId = design.Id,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Employees.AddRange(jane, john);
        await db.SaveChangesAsync(cancellationToken);

        var categories = new[]
        {
            new EquipmentCategory { Name = "Laptop", Description = "Portable computers", CreatedAt = now, UpdatedAt = now },
            new EquipmentCategory { Name = "Monitor", Description = "Displays", CreatedAt = now, UpdatedAt = now },
            new EquipmentCategory { Name = "Phone", Description = "Mobile phones", CreatedAt = now, UpdatedAt = now },
            new EquipmentCategory { Name = "Tablet", Description = "Tablets", CreatedAt = now, UpdatedAt = now },
            new EquipmentCategory { Name = "Furniture", Description = "Office furniture", CreatedAt = now, UpdatedAt = now },
        };
        db.EquipmentCategories.AddRange(categories);
        await db.SaveChangesAsync(cancellationToken);

        var laptopCat = categories[0];
        var monitorCat = categories[1];
        var phoneCat = categories[2];
        var tabletCat = categories[3];
        var furnitureCat = categories[4];

        var models = new[]
        {
            new EquipmentModel { Name = "MacBook Pro 14\"", CategoryId = laptopCat.Id, DefaultValue = 2499.99m, LowStockThreshold = 1, CreatedAt = now, UpdatedAt = now },
            new EquipmentModel { Name = "Dell UltraSharp 27\"", CategoryId = monitorCat.Id, DefaultValue = 449.99m, LowStockThreshold = 2, CreatedAt = now, UpdatedAt = now },
            new EquipmentModel { Name = "iPhone 15", CategoryId = phoneCat.Id, DefaultValue = 799.99m, LowStockThreshold = 2, CreatedAt = now, UpdatedAt = now },
            new EquipmentModel { Name = "iPad Pro 12.9\"", CategoryId = tabletCat.Id, DefaultValue = 1299.99m, LowStockThreshold = 1, CreatedAt = now, UpdatedAt = now },
            new EquipmentModel { Name = "Standing Desk", CategoryId = furnitureCat.Id, DefaultValue = 599.99m, LowStockThreshold = 1, CreatedAt = now, UpdatedAt = now },
        };
        db.EquipmentModels.AddRange(models);
        await db.SaveChangesAsync(cancellationToken);

        var macbookModel = models[0];
        var monitorModel = models[1];
        var iphoneModel = models[2];
        var ipadModel = models[3];

        var assets = new[]
        {
            new EquipmentAsset
            {
                EquipmentModelId = macbookModel.Id,
                AssetTag = "LT-001",
                SerialNumber = "MBP-001",
                Status = EquipmentAssetStatus.InUse,
                AssignedEmployeeId = jane.Id,
                AssignedAt = now,
                ExpectedReturnDate = DateOnly.Parse("2026-12-31"),
                CreatedAt = now,
                UpdatedAt = now,
            },
            new EquipmentAsset
            {
                EquipmentModelId = monitorModel.Id,
                AssetTag = "MON-001",
                Status = EquipmentAssetStatus.InUse,
                AssignedEmployeeId = john.Id,
                AssignedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new EquipmentAsset
            {
                EquipmentModelId = iphoneModel.Id,
                AssetTag = "PH-001",
                Status = EquipmentAssetStatus.Available,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new EquipmentAsset
            {
                EquipmentModelId = iphoneModel.Id,
                AssetTag = "PH-002",
                Status = EquipmentAssetStatus.Maintenance,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new EquipmentAsset
            {
                EquipmentModelId = ipadModel.Id,
                AssetTag = "TB-001",
                Status = EquipmentAssetStatus.Available,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new EquipmentAsset
            {
                EquipmentModelId = models[4].Id,
                AssetTag = "FURN-001",
                Status = EquipmentAssetStatus.Retired,
                RetiredAt = now.AddDays(-40),
                RetiredById = procurementManager.Id,
                CreatedAt = now,
                UpdatedAt = now,
            },
        };
        db.EquipmentAssets.AddRange(assets);
        await db.SaveChangesAsync(cancellationToken);

        db.EquipmentAssignments.AddRange(
            new EquipmentAssignment
            {
                EquipmentAssetId = assets[0].Id,
                EmployeeId = jane.Id,
                AssignedById = procurementManager.Id,
                AssignedAt = now,
                ExpectedReturnDate = DateOnly.Parse("2026-12-31"),
                Status = EquipmentAssignmentStatus.Active,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new EquipmentAssignment
            {
                EquipmentAssetId = assets[1].Id,
                EmployeeId = john.Id,
                AssignedById = procurementManager.Id,
                AssignedAt = now,
                Status = EquipmentAssignmentStatus.Active,
                CreatedAt = now,
                UpdatedAt = now,
            });

        var loanRequest = new EquipmentRequest
        {
            RequesterId = john.Id,
            RequestType = RequestType.Loan,
            EquipmentModelId = iphoneModel.Id,
            CategoryId = phoneCat.Id,
            Quantity = 1,
            StartDate = DateOnly.Parse("2026-07-01"),
            EndDate = DateOnly.Parse("2026-12-31"),
            Purpose = "Need company phone for client site visits",
            Status = RequestStatus.PendingManagerApproval,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.EquipmentRequests.Add(loanRequest);
        await db.SaveChangesAsync(cancellationToken);

        var loanManagerStep = new ApprovalStep
        {
            RequestId = loanRequest.Id,
            Level = 1,
            ApproverId = bob.Id,
            ApproverRole = ApprovalRole.DirectManager,
            Status = ApprovalStepStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.ApprovalSteps.Add(loanManagerStep);

        var procurementRequest = new EquipmentRequest
        {
            RequesterId = jane.Id,
            RequestType = RequestType.Procurement,
            RequestedItemName = "Ergonomic standing desk",
            CategoryId = furnitureCat.Id,
            Quantity = 1,
            StartDate = DateOnly.Parse("2026-08-01"),
            EndDate = DateOnly.Parse("2027-08-01"),
            Purpose = "Need adjustable desk for home office setup",
            Status = RequestStatus.PendingProcurementApproval,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.EquipmentRequests.Add(procurementRequest);
        await db.SaveChangesAsync(cancellationToken);

        db.ApprovalSteps.AddRange(
            new ApprovalStep
            {
                RequestId = procurementRequest.Id,
                Level = 1,
                ApproverId = bob.Id,
                ApproverRole = ApprovalRole.DirectManager,
                Status = ApprovalStepStatus.Approved,
                Comment = "Approved business need",
                ActedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ApprovalStep
            {
                RequestId = procurementRequest.Id,
                Level = 2,
                ApproverId = procurementManager.Id,
                ApproverRole = ApprovalRole.ProcurementManager,
                Status = ApprovalStepStatus.Pending,
                CreatedAt = now,
                UpdatedAt = now,
            });
        await db.SaveChangesAsync(cancellationToken);

        var procurementStep = await db.ApprovalSteps
            .FirstAsync(s => s.RequestId == procurementRequest.Id && s.Level == 2, cancellationToken);

        db.Notifications.AddRange(
            new Notification
            {
                RecipientId = bob.Id,
                Type = NotificationType.ApprovalRequired,
                Title = "Approval required: iPhone 15",
                Message = "John Smith submitted a loan request for iPhone 15.",
                RequestId = loanRequest.Id,
                ApprovalStepId = loanManagerStep.Id,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new Notification
            {
                RecipientId = procurementManager.Id,
                Type = NotificationType.ApprovalRequired,
                Title = "Approval required: Ergonomic standing desk",
                Message = "Jane Doe procurement request awaits review.",
                RequestId = procurementRequest.Id,
                ApprovalStepId = procurementStep.Id,
                CreatedAt = now,
                UpdatedAt = now,
            });
        await db.SaveChangesAsync(cancellationToken);

        Console.WriteLine("Seed completed successfully.");
        Console.WriteLine($"Password for all users: {DemoPassword}");
        Console.WriteLine(
            "Users: admin@ministryofprogramming.com, pat.procurement@ministryofprogramming.com, " +
            "bob.manager@ministryofprogramming.com, jane.doe@ministryofprogramming.com, john.smith@ministryofprogramming.com");
        Console.WriteLine($"Departments: {engineering.Name}, {design.Name}, {operations.Name}");
        Console.WriteLine($"Categories: {categories.Length}, Models: {models.Length}, Assets: {assets.Length}");
    }
}
