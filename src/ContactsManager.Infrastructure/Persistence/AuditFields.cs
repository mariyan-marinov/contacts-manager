namespace ContactsManager.Infrastructure.Persistence;

/// <summary>
/// Audit timestamps are shadow properties: they belong to the row, not to the domain model, and
/// nothing in Domain should be able to set them.
/// </summary>
internal static class AuditFields
{
    internal const string CreatedAt = "CreatedAt";
    internal const string UpdatedAt = "UpdatedAt";
}
