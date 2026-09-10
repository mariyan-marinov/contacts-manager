using ContactsManager.Domain.Contacts;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Infrastructure.Persistence;

/// <summary>
/// Fifty-five contacts spread across countries and surnames, so sorting, paging and searching have
/// something to show — enough rows that the default page of twenty is not the whole list. Every
/// IBAN below is checksum-valid, and each contact is built through the domain factories, so bad
/// seed data fails here rather than lying in the database.
/// </summary>
public static class ContactSeeder
{
    /// <summary>
    /// How many contacts a freshly seeded database holds. Tests assert against this rather than
    /// against a literal of their own, so growing the list below means changing the number once
    /// and being told by a failing test if it was missed.
    /// </summary>
    public const int SeededCount = 55;

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
        Make(clock, "Aoife", "Ahearn", 1993, 3, 11, "Patrick Street", "62", "T12 XY45", "Cork", "IE",
            "+353 21 427 8890", "IE35DICF55940122268581"),
        Make(clock, "Tobias", "Aleksson", 1981, 7, 4, "Drottninggatan", "88", "111 36", "Stockholm", "SE",
            "+46 8 545 1180", "SE7874924135637879892794"),
        Make(clock, "Elif", "Arslan", 1997, 11, 26, "Bahnhofplatz", "7", "8001", "Zurich", "CH",
            "+41 44 268 7712", "CH4550064RD9T4WLFXUZE"),
        Make(clock, "Milan", "Beran", 1974, 5, 19, "Vinohradska", "112", "130 00", "Prague", "CZ",
            "+420 2 2109 4400", "CZ1788406698983351788354"),
        Make(clock, "Ingrid", "Bergqvist", 2000, 2, 9, "Sodra Vagen", "14", "412 54", "Gothenburg", "SE",
            "+46 31 774 6620", "SE3332224420433517875527"),
        Make(clock, "Dorota", "Bielinska", 1986, 9, 30, "Ulica Dluga", "27", "80-831", "Gdansk", "PL",
            "+48 58 301 7755", "PL13088888105053357317399533"),
        Make(clock, "Marnix", "Boonstra", 1991, 6, 15, "Oudegracht", "196", "3511 NP", "Utrecht", "NL",
            "+31 30 233 9040", "NL56ELTY5962964240"),
        Make(clock, "Sofia", "Chatzi", 1995, 1, 23, "Ermou", "45", "105 63", "Athens", "GR",
            "+30 21 0325 6680", "GR2905601744ALESAH6HJNHJW5J"),
        Make(clock, "Rasmus", "Dahl", 1978, 12, 7, "Vesterbrogade", "63", "1620", "Copenhagen", "DK",
            "+45 33 25 8890", "DK1041035062280216"),
        Make(clock, "Katalin", "Deak", 1989, 8, 21, "Andrassy ut", "58", "1062", "Budapest", "HU",
            "+36 1 322 5540", "HU16764158325450719682275468"),
        Make(clock, "Emeric", "Dubois", 1972, 4, 2, "Rue de la Republique", "104", "69002", "Lyon", "FR",
            "+33 4 7237 8811", "FR285024959352ZOOA3RS3AZG53"),
        Make(clock, "Signe", "Eriksen", 2003, 10, 14, "Norrebrogade", "31", "2200", "Copenhagen", "DK",
            "+45 35 36 1180", "DK5906503596742544"),
        Make(clock, "Paolo", "Fontana", 1984, 2, 28, "Corso Buenos Aires", "77", "20124", "Milan", "IT",
            "+39 02 6690 4412", "IT98U4684682101422256009287"),
        Make(clock, "Anneli", "Forsberg", 1998, 7, 17, "Mannerheimintie", "52", "00260", "Helsinki", "FI",
            "+358 9 4241 7730", "FI3816663610535016"),
        Make(clock, "Guillem", "Fuster", 1976, 11, 11, "Carrer de Colon", "18", "46004", "Valencia", "ES",
            "+34 96 351 2280", "ES2831443426461065407865"),
        Make(clock, "Ilse", "Gruber", 1992, 5, 25, "Getreidegasse", "24", "5020", "Salzburg", "AT",
            "+43 662 843 7710", "AT462584310019704889"),
        Make(clock, "Nikola", "Horvat", 1987, 3, 6, "Ilica", "91", "10000", "Zagreb", "HR",
            "+385 1 481 6640", "HR0438866934112618418"),
        Make(clock, "Sigrun", "Jonsdottir", 1999, 9, 12, "Laugavegur", "35", "101", "Reykjavik", "IS",
            "+354 552 8890", "IS192770177954491224759621"),
        Make(clock, "Anton", "Kallio", 1970, 6, 29, "Aleksanterinkatu", "19", "00100", "Helsinki", "FI",
            "+358 9 6220 4415", "FI8107605729920093"),
        Make(clock, "Zofia", "Krawiec", 2005, 4, 18, "Ulica Grodzka", "52", "31-044", "Krakow", "PL",
            "+48 12 430 8820", "PL16481011927518202642713165"),
        Make(clock, "Bram", "Kuipers", 1982, 1, 8, "Coolsingel", "75", "3012 AD", "Rotterdam", "NL",
            "+31 10 414 6650", "NL75TYVK4974488730"),
        Make(clock, "Egle", "Kuzmaite", 1996, 12, 20, "Gedimino prospektas", "9", "01103", "Vilnius", "LT",
            "+370 5 261 7740", "LT630492706028496971"),
        Make(clock, "Henri", "Laurent", 1973, 8, 3, "Grand Rue", "41", "1660", "Luxembourg", "LU",
            "+352 26 20 4480", "LU51905Z42XR4OJSIEX9"),
        Make(clock, "Marta", "Lehmann", 1990, 10, 27, "Konigsallee", "66", "40212", "Dusseldorf", "DE",
            "+49 211 862 3340", "DE66270240416877691274"),
        Make(clock, "Rui", "Machado", 1985, 7, 13, "Rua de Santa Catarina", "228", "4000-443", "Porto", "PT",
            "+351 22 205 9960", "PT27797127599797597867063"),
        Make(clock, "Ines", "Marchetti", 2002, 3, 24, "Via Toledo", "148", "80134", "Naples", "IT",
            "+39 081 551 7720", "IT05I5747991322874873959846"),
        Make(clock, "Ciara", "McGrath", 1994, 5, 6, "Shop Street", "13", "H91 R2P8", "Galway", "IE",
            "+353 91 563 3340", "IE93TXXB11439981218178"),
        Make(clock, "Kristjan", "Mets", 1979, 2, 16, "Viru", "8", "10140", "Tallinn", "EE",
            "+372 6 411 8850", "EE387926467418962759"),
        Make(clock, "Anouk", "Moreau", 2006, 6, 22, "Rue Nationale", "57", "37000", "Tours", "FR",
            "+33 2 4720 6690", "FR639346106726HLJIXJOFMPT56"),
        Make(clock, "Vasil", "Nikolov", 1988, 9, 4, "Bulevard Vitosha", "34", "1000", "Sofia", "BG",
            "+359 2 981 4470", "BG77ATHH712117ZGZIZJ75"),
        Make(clock, "Freya", "Nordbo", 1971, 11, 15, "Karl Johans gate", "22", "0159", "Oslo", "NO",
            "+47 22 42 8830", "NO5266277825909"),
        Make(clock, "Lorcan", "O'Sullivan", 1993, 1, 31, "Eyre Square", "4", "H91 CE80", "Galway", "IE",
            "+353 91 562 2210", "IE95SOJD07363932148128"),
        Make(clock, "Aitana", "Ortega", 1997, 8, 9, "Calle Larios", "12", "29015", "Malaga", "ES",
            "+34 95 221 6640", "ES8583956507025250661743"),
        Make(clock, "Jonas", "Petersen", 1983, 4, 26, "Reeperbahn", "108", "20359", "Hamburg", "DE",
            "+49 40 319 7780", "DE58467542805653270917"),
        Make(clock, "Ana-Maria", "Popescu", 2001, 5, 12, "Calea Victoriei", "83", "010065", "Bucharest", "RO",
            "+40 21 315 6620", "RO26KDVE7DXZWPQWBXVDDNVN"),
        Make(clock, "Ondrej", "Rybar", 1977, 7, 21, "Obchodna", "39", "811 06", "Bratislava", "SK",
            "+421 2 5443 8890", "SK0552141291623659157861"),
        Make(clock, "Marta", "Simoes", 2004, 9, 17, "Avenida da Liberdade", "144", "1250-146", "Lisbon", "PT",
            "+351 21 342 7710", "PT82735888252641516481947"),
        Make(clock, "Blaz", "Slokar", 1980, 12, 1, "Trubarjeva cesta", "28", "1000", "Ljubljana", "SI",
            "+386 1 234 5560", "SI27799594560374949"),
        Make(clock, "Emma", "Thorne", 1991, 2, 14, "Deansgate", "142", "M3 2GY", "Manchester", "GB",
            "+44 161 236 7740", "GB72LUAD58912072465750"),
        Make(clock, "Vincent", "Van Damme", 1968, 6, 10, "Meir", "52", "2000", "Antwerp", "BE",
            "+32 3 231 4460", "BE77747132387336"),
        Make(clock, "Lieke", "Verhoeven", 1999, 3, 28, "Vughterstraat", "17", "5211 EW", "Den Bosch", "NL",
            "+31 73 613 8820", "NL02ATKQ1271555737"),
        Make(clock, "Rebecca", "Whitfield", 1975, 10, 5, "Princes Street", "96", "EH2 2ER", "Edinburgh", "GB",
            "+44 131 226 3310", "GB59ZCYE32932232156743"),
        Make(clock, "Petra", "Zeman", 1987, 1, 19, "Masarykova", "31", "602 00", "Brno", "CZ",
            "+420 5 4212 6680", "CZ8290065610548076881055"),
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
            Iban.Create(iban));
}
