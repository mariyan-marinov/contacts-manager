namespace ContactsManager.Domain.Validation;

public static class Mod97
{
    /// <summary>
    /// IBAN checksum per ISO 13616: move the first four characters to the end, replace each letter
    /// with two digits (A=10 … Z=35), and the resulting number must leave a remainder of 1 modulo 97.
    /// The remainder is folded in digit by digit because the full number is far wider than any
    /// integer type.
    /// </summary>
    public static bool IsValid(string? iban)
    {
        if (string.IsNullOrWhiteSpace(iban) || iban.Length is < 15 or > 34)
        {
            return false;
        }

        var remainder = 0;

        for (var offset = 0; offset < iban.Length; offset++)
        {
            var character = iban[(offset + 4) % iban.Length];

            if (char.IsAsciiDigit(character))
            {
                remainder = ((remainder * 10) + (character - '0')) % 97;
            }
            else if (char.IsAsciiLetterUpper(character))
            {
                remainder = ((remainder * 100) + (character - 'A' + 10)) % 97;
            }
            else
            {
                return false;
            }
        }

        return remainder == 1;
    }
}
