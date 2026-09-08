using ContactsManager.Domain.Contacts;
using FluentValidation;

namespace ContactsManager.Domain.Validation;

/// <summary>
/// The aggregate-level check run by <see cref="Contact.Create"/>. Every part arrives as a value
/// object that already validated itself in its own factory, so re-running those rules here would
/// only check the same text a second time — this asserts that each part is present, and exists as
/// the one obvious place for a rule that spans more than one field.
/// </summary>
public sealed class ContactValidator : AbstractValidator<Contact>
{
    public ContactValidator()
    {
        RuleFor(contact => contact.Name).NotNull();
        RuleFor(contact => contact.DateOfBirth).NotNull();
        RuleFor(contact => contact.Address).NotNull();
        RuleFor(contact => contact.Phone).NotNull();
        RuleFor(contact => contact.Iban).NotNull();
    }
}
