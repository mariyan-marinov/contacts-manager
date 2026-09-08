using ContactsManager.Domain.Contacts;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Infrastructure.Persistence;

/// <summary>
/// Twelve contacts spread across countries and surnames, so sorting and paging have something to
/// show. Every IBAN below is checksum-valid, and each contact is built through the domain factories
/// — bad seed data fails here rather than lying in the database.
/// </summary>
public static class ContactSeeder
{
    /// <summary>
    /// Does nothing once the table holds anything at all, so a restart — or a second test run
    /// against a database that survived the first — does not stack up duplicates.
    /// </summary>
    public static async Task SeedAsync(
        ContactsDbContext context,
        TimeProvider clock,
        CancellationToken cancellationToken = default)
    {
        if (await context.Contacts.AnyAsync(cancellationToken))
        {
            return;
        }

        context.Contacts.AddRange(Build(clock));
        await context.SaveChangesAsync(cancellationToken);
    }

    private static IEnumerable<Contact> Build(TimeProvider clock) =>
    [
        Make(clock, "Sanne", "Bakker", 1988, 4, 12, "Keizersgracht", "241", "1016 EA", "Amsterdam", "NL",
            "+31 6 2145 8890", "NL91ABNA0417164300"),
        Make(clock, "Lukas", "Brandt", 1975, 11, 3, "Unter den Linden", "5", "10117", "Berlin", "DE",
            "+49 30 9014 2200", "DE89370400440532013000"),
        Make(clock, "Eleanor", "Cavendish", 1992, 7, 21, "Fleet Street", "118", "EC4A 2AB", "London", "GB",
            "+44 20 7946 0018", "GB82WEST12345698765432"),
        Make(clock, "Mathis", "Declercq", 1969, 1, 30, "Rue de la Loi", "16", "1000", "Brussels", "BE",
            "+32 2 501 8844", "BE68539007547034"),
        Make(clock, "Núria", "Espinosa", 1996, 9, 8, "Carrer de Mallorca", "401", "08013", "Barcelona", "ES",
            "+34 93 245 7712", "ES9121000418450200051332"),
        Make(clock, "Andrea", "Ferrari", 1983, 3, 17, "Via del Corso", "12", "00186", "Rome", "IT",
            "+39 06 6992 1140", "IT60X0542811101000000123456"),
        Make(clock, "Camille", "Girard", 1990, 12, 5, "Rue Saint-Honoré", "231", "75001", "Paris", "FR",
            "+33 1 4260 3355", "FR1420041010050500013M02606"),
        Make(clock, "Niamh", "Hennessy", 1979, 6, 24, "Grafton Street", "78", "D02 VK65", "Dublin", "IE",
            "+353 1 679 4400", "IE29AIBK93115212345678"),
        Make(clock, "Marek", "Kowalczyk", 1965, 2, 14, "Ulica Floriańska", "3", "31-019", "Krakow", "PL",
            "+48 12 422 1100", "PL61109010140000071219812874"),
        Make(clock, "Beatriz", "Loureiro", 1994, 8, 19, "Rua Augusta", "144", "1100-053", "Lisbon", "PT",
            "+351 21 346 7788", "PT50000201231234567890154"),
        Make(clock, "Fabian", "Meier", 1986, 5, 2, "Bahnhofstrasse", "21", "8001", "Zurich", "CH",
            "+41 44 215 9060", "CH9300762011623852957"),
        Make(clock, "Johanna", "Steiner", 2001, 10, 28, "Kärntner Strasse", "9", "1010", "Vienna", "AT",
            "+43 1 512 3377", "AT611904300234573201"),
    ];

    private static Contact Make(
        TimeProvider clock,
        string first,
        string surname,
        int year,
        int month,
        int day,
        string street,
        string houseNumber,
        string postalCode,
        string city,
        string country,
        string phone,
        string iban) =>
        Contact.Create(
            PersonName.Create(first, surname),
            DateOfBirth.Create(new DateOnly(year, month, day), clock),
            Address.Create(street, houseNumber, postalCode, city, country),
            PhoneNumber.Create(phone),
            Iban.Create(iban),
            clock);
}
