using FluentValidation;

namespace ContactsManager.Application.Features.Contacts.GetContactById;

internal sealed class GetContactByIdQueryValidator : AbstractValidator<GetContactByIdQuery>
{
    public GetContactByIdQueryValidator() => RuleFor(query => query.Id).NotEmpty();
}
