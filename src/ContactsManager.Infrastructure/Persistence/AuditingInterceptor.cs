using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ContactsManager.Infrastructure.Persistence;

/// <summary>
/// Stamps the audit timestamps on the way to the database. An interceptor rather than a line in each
/// handler, because the fields are shadow properties the domain cannot reach — and because this way
/// nothing can be written without them, seeding and tests included.
/// </summary>
internal sealed class AuditingInterceptor(TimeProvider clock) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        Stamp(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Stamp(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    /// <summary>
    /// Only entities that declare the audit fields are touched, so this stays correct if a type is
    /// mapped later without them. Created is written once; updated on every save that changes a row.
    /// </summary>
    private void Stamp(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var now = clock.GetUtcNow();

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.Metadata.FindProperty(AuditFields.CreatedAt) is null)
            {
                continue;
            }

            if (entry.State is EntityState.Added)
            {
                entry.Property(AuditFields.CreatedAt).CurrentValue = now;
            }

            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Property(AuditFields.UpdatedAt).CurrentValue = now;
            }
        }
    }
}
