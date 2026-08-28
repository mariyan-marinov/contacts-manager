using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ContactsManager.Infrastructure.Persistence;

internal sealed class ContactConfiguration : IEntityTypeConfiguration<Contact>
{
    public void Configure(EntityTypeBuilder<Contact> builder)
    {
        builder.ToTable("contacts");

        builder.HasKey(contact => contact.Id);

        builder.Property(contact => contact.Id)
            .HasColumnName("id")
            .HasConversion(id => id.Value, value => new ContactId(value))
            .ValueGeneratedNever();

        // `xmin` is a Postgres system column, so it is read rather than created by the migration.
        builder.Property(contact => contact.Version)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();

        builder.ComplexProperty(contact => contact.Name, name =>
        {
            name.Property(part => part.First)
                .HasColumnName("first_name")
                .HasMaxLength(ContactRules.NameMaxLength);

            name.Property(part => part.Surname)
                .HasColumnName("surname")
                .HasMaxLength(ContactRules.NameMaxLength);
        });

        builder.ComplexProperty(contact => contact.DateOfBirth, dateOfBirth =>
            dateOfBirth.Property(value => value.Value).HasColumnName("date_of_birth"));

        builder.ComplexProperty(contact => contact.Address, address =>
        {
            address.Property(part => part.Street)
                .HasColumnName("address_street")
                .HasMaxLength(ContactRules.StreetMaxLength);

            address.Property(part => part.HouseNumber)
                .HasColumnName("address_house_number")
                .HasMaxLength(ContactRules.HouseNumberMaxLength);

            address.Property(part => part.PostalCode)
                .HasColumnName("address_postal_code")
                .HasMaxLength(ContactRules.PostalCodeMaxLength);

            address.Property(part => part.City)
                .HasColumnName("address_city")
                .HasMaxLength(ContactRules.CityMaxLength);

            address.Property(part => part.Country)
                .HasColumnName("address_country")
                .HasMaxLength(2)
                .IsFixedLength();
        });

        builder.ComplexProperty(contact => contact.Phone, phone =>
            phone.Property(value => value.Value)
                .HasColumnName("phone_number")
                .HasMaxLength(ContactRules.PhoneMaxLength));

        builder.ComplexProperty(contact => contact.Iban, iban =>
            iban.Property(value => value.Value)
                .HasColumnName("iban")
                .HasMaxLength(ContactRules.IbanMaxLength));

        builder.Property<DateTimeOffset>(AuditFields.CreatedAt).HasColumnName("created_at");
        builder.Property<DateTimeOffset>(AuditFields.UpdatedAt).HasColumnName("updated_at");

        // The (surname, first_name) index that backs the default sort is declared in the migration
        // instead of here: EF Core 10 cannot build an index over complex type properties, by
        // member access or by name. Revisit if a later EF lifts that restriction.
    }
}
