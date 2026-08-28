using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ContactsManager.Infrastructure.Persistence;

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
