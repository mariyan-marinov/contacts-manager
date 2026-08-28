using ContactsManager.Domain.Contacts;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

/// <summary>
/// The aggregate-level check run by <see cref="Contact.Create"/>. Each value object has already
/// validated itself, so today this only asserts that every part is present — it exists as the one
/// obvious place for a rule that spans more than one field.
/// </summary>
public sealed class ContactValidator : AbstractValidator<Contact>
{
    public ContactValidator(DateOnly today)
    {
        RuleFor(contact => contact.Name).NotNull().SetValidator(new PersonNameValidator());
        RuleFor(contact => contact.DateOfBirth).NotNull().SetValidator(new DateOfBirthValidator(today));
        RuleFor(contact => contact.Address).NotNull().SetValidator(new AddressValidator());
        RuleFor(contact => contact.Phone).NotNull().SetValidator(new PhoneNumberValidator());
        RuleFor(contact => contact.Iban).NotNull().SetValidator(new IbanValidator());
    }
}
