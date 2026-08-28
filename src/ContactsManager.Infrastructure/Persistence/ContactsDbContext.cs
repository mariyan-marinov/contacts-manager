using ContactsManager.Application.Abstractions;
using ContactsManager.Domain.Contacts;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Infrastructure.Persistence;

public sealed class ContactsDbContext(DbContextOptions<ContactsDbContext> options)
    : DbContext(options), IUnitOfWork, IContactReadContext
{
    public DbSet<Contact> Contacts => Set<Contact>();

    /// <summary>Untracked at the seam, so no query can accidentally hand back a tracked aggregate.</summary>
    IQueryable<Contact> IContactReadContext.Contacts => Contacts.AsNoTracking();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ContactsDbContext).Assembly);
}
