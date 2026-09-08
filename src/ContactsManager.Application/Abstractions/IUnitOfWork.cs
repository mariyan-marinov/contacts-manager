namespace ContactsManager.Application.Abstractions;

/// <summary>
/// The commit boundary, owned by the handler rather than by the repository: a handler decides when a
/// request's work is complete, and everything it touched is written in one save.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
