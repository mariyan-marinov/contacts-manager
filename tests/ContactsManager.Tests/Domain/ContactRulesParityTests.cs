using System.Reflection;
using System.Text.RegularExpressions;
using ContactsManager.Domain.Validation;

namespace ContactsManager.Tests.Domain;

/// <summary>
/// The frontend mirrors these rules so an obvious slip costs no round trip, which means the same
/// limits are written twice in two languages. This is what stops the two copies drifting: it reads
/// the TypeScript and fails if any constant or pattern disagrees with the C# it claims to mirror.
///
/// A rule added on this side with no counterpart on that one fails here too, so the mirror cannot
/// quietly fall behind.
/// </summary>
public class ContactRulesParityTests
{
    private static readonly string Mirror = ReadMirror();

    /// <summary>
    /// C# names the constants in Pascal case and TypeScript in camel case, so the mapping is spelled
    /// out rather than inferred — a renamed constant should fail loudly, not be silently skipped.
    /// </summary>
    public static TheoryData<string, string> Constants => new()
    {
        { nameof(ContactRules.NameMaxLength), "nameMaxLength" },
        { nameof(ContactRules.StreetMaxLength), "streetMaxLength" },
        { nameof(ContactRules.HouseNumberMaxLength), "houseNumberMaxLength" },
        { nameof(ContactRules.PostalCodeMaxLength), "postalCodeMaxLength" },
        { nameof(ContactRules.CityMaxLength), "cityMaxLength" },
        { nameof(ContactRules.MaximumAgeInYears), "maximumAgeInYears" },
        { nameof(ContactRules.PhoneMinLength), "phoneMinLength" },
        { nameof(ContactRules.PhoneMaxLength), "phoneMaxLength" },
        { nameof(ContactRules.PhoneMinimumDigits), "phoneMinimumDigits" },
        { nameof(ContactRules.IbanMinLength), "ibanMinLength" },
        { nameof(ContactRules.IbanMaxLength), "ibanMaxLength" },
    };

    /// <summary>The private pattern factories on <see cref="ContactRules"/>, by their mirror name.</summary>
    public static TheoryData<string, string> Patterns => new()
    {
        { "PersonNamePattern", "personName" },
        { "PostalCodePattern", "postalCode" },
        { "PhonePattern", "phone" },
        { "IbanPattern", "iban" },
    };

    [Theory]
    [MemberData(nameof(Constants))]
    public void The_frontend_mirrors_every_numeric_rule(string csharpName, string mirrorName)
    {
        var expected = (int)typeof(ContactRules).GetField(csharpName)!.GetRawConstantValue()!;
        var actual = ReadNumber(mirrorName);

        Assert.Equal(expected, actual);
    }

    [Theory]
    [MemberData(nameof(Patterns))]
    public void The_frontend_mirrors_every_pattern(string factoryName, string mirrorName)
    {
        var expected = InvokePatternFactory(factoryName).ToString();
        var actual = ReadPattern(mirrorName);

        Assert.Equal(expected, actual);
    }

    [Fact]
    public void Every_numeric_rule_is_covered_by_this_test()
    {
        var declared = typeof(ContactRules)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field is { IsLiteral: true, FieldType.Name: nameof(Int32) })
            .Select(field => field.Name);

        var covered = Constants.Select(row => row.Data.Item1);

        Assert.Empty(declared.Except(covered, StringComparer.Ordinal));
    }

    [Fact]
    public void Every_pattern_is_covered_by_this_test()
    {
        var declared = typeof(ContactRules)
            .GetMethods(BindingFlags.NonPublic | BindingFlags.Static)
            .Where(method => method.ReturnType == typeof(Regex) && method.GetParameters().Length == 0)
            .Select(method => method.Name);

        var covered = Patterns.Select(row => row.Data.Item1);

        Assert.Empty(declared.Except(covered, StringComparer.Ordinal));
    }

    private static Regex InvokePatternFactory(string name) =>
        (Regex)typeof(ContactRules)
            .GetMethod(name, BindingFlags.NonPublic | BindingFlags.Static)!
            .Invoke(null, null)!;

    /// <summary>`  nameMaxLength: 50,` — the value as the mirror states it.</summary>
    private static int ReadNumber(string name)
    {
        var match = Regex.Match(Mirror, $@"^\s*{Regex.Escape(name)}:\s*(\d+),\s*$", RegexOptions.Multiline);

        Assert.True(match.Success, $"'{name}' is not declared in contact-rules.ts.");

        return int.Parse(match.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>
    /// `  personName: /^…$/u,` — the source between the delimiters, which is what a C# pattern
    /// string is compared against. Trailing flags are the one difference the two are allowed.
    /// </summary>
    private static string ReadPattern(string name)
    {
        var match = Regex.Match(Mirror, $@"^\s*{Regex.Escape(name)}:\s*/(.*)/[a-z]*,\s*$", RegexOptions.Multiline);

        Assert.True(match.Success, $"'{name}' is not declared in contact-rules.ts.");

        return match.Groups[1].Value;
    }

    /// <summary>
    /// Walks up from the test binaries to the solution file, so the path holds however deep the
    /// build output happens to be nested.
    /// </summary>
    private static string ReadMirror()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "ContactsManager.slnx")))
        {
            directory = directory.Parent;
        }

        Assert.NotNull(directory);

        var mirror = Path.Combine(
            directory.FullName, "web", "src", "app", "contacts", "data-access", "contact-rules.ts");

        Assert.True(File.Exists(mirror), $"The frontend mirror was not found at {mirror}.");

        return File.ReadAllText(mirror);
    }
}
