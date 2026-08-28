using FluentValidation;

namespace ContactsManager.Application.Features.Contacts.GetContacts;

internal sealed class GetContactsQueryValidator : AbstractValidator<GetContactsQuery>
{
    public GetContactsQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThanOrEqualTo(1)
            .WithMessage("'{PropertyName}' starts at 1.");

        RuleFor(query => query.Size)
            .InclusiveBetween(1, GetContactsQuery.MaximumSize)
            .WithMessage($"'{{PropertyName}}' must be between 1 and {GetContactsQuery.MaximumSize}.");

        RuleFor(query => query.Sort)
            .Must(ContactSort.AllowedFields.Contains)
            .WithMessage($"'{{PropertyName}}' must be one of: {string.Join(", ", ContactSort.AllowedFields)}.");

        RuleFor(query => query.Direction)
            .Must(ContactSort.AllowedDirections.Contains)
            .WithMessage($"'{{PropertyName}}' must be '{ContactSort.Ascending}' or '{ContactSort.Descending}'.");

        RuleFor(query => query.Search)
            .MaximumLength(100)
            .When(query => query.Search is not null);
    }
}
