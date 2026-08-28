using ContactsManager.Application.Abstractions;
using ContactsManager.Domain.Contacts;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Infrastructure.Persistence;

public sealed class ContactsDbContext(DbContextOptions<ContactsDbContext> options)
    : DbContext(options), IUnitOfWork
{
    public DbSet<Contact> Contacts => Set<Contact>();

    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ContactsDbContext).Assembly);
}
