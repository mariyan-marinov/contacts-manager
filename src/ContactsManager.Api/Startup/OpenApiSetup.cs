using System.Text.Json.Nodes;
using ContactsManager.Application.Common;
using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Features.Contacts.CreateContact;
using ContactsManager.Application.Features.Contacts.GetContacts;
using ContactsManager.Application.Features.Contacts.UpdateContact;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi;

namespace ContactsManager.Api.Startup;

/// <summary>
/// The OpenAPI document, and the examples Swagger UI and Scalar render from it. Examples are keyed by
/// CLR type and attached by a schema transformer, so a shape gets the same example wherever it
/// appears — request body, response, or nested inside a page of results.
/// </summary>
internal static class OpenApiSetup
{
    /// <summary>
    /// One contact, reused across every example so the document tells a single coherent story. It is
    /// the first seeded contact, which means every value here is one the validators accept.
    /// </summary>
    private const string ExampleId = "8f1d0f1e-3a6c-4a2b-9c7d-0b5a2e6f1c34";

    private static JsonObject Address() => new()
    {
        ["street"] = "Keizersgracht",
        ["houseNumber"] = "241",
        ["postalCode"] = "1016 EA",
        ["city"] = "Amsterdam",
        ["country"] = "NL",
    };

    private static JsonObject CreateContact() => new()
    {
        ["firstName"] = "Sanne",
        ["surname"] = "Bakker",
        ["dateOfBirth"] = "1988-04-12",
        ["address"] = Address(),
        ["phoneNumber"] = "+31 6 2145 8890",
        ["iban"] = "NL91ABNA0417164300",
    };

    private static JsonObject UpdateContact()
    {
        var contact = CreateContact();
        contact["id"] = ExampleId;
        // What the client last read. Send back a stale one and the write is rejected with a 409.
        contact["version"] = 7;
        return contact;
    }

    private static JsonObject ContactDetail()
    {
        var contact = UpdateContact();
        contact["iban"] = "NL91ABNA0417164300";
        return contact;
    }

    private static JsonObject ContactListItem() => new()
    {
        ["id"] = ExampleId,
        ["firstName"] = "Sanne",
        ["surname"] = "Bakker",
        ["dateOfBirth"] = "1988-04-12",
        ["city"] = "Amsterdam",
        ["country"] = "NL",
        ["phoneNumber"] = "+31 6 2145 8890",
        // The list never carries the full account number, and neither does its example.
        ["ibanMasked"] = "NL91****4300",
    };

    private static JsonObject PageOfContacts() => new()
    {
        ["items"] = new JsonArray(ContactListItem()),
        ["total"] = 12,
        ["page"] = 1,
        ["size"] = 20,
    };

    private static JsonObject ValidationProblem() => new()
    {
        ["type"] = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
        ["title"] = "One or more validation errors occurred.",
        ["status"] = 400,
        ["errors"] = new JsonObject
        {
            ["iban"] = new JsonArray("'Iban' has an invalid checksum."),
            ["address.country"] = new JsonArray("'Country' must be an ISO 3166-1 alpha-2 country code."),
        },
    };

    private static JsonObject NotFoundProblem() => new()
    {
        ["type"] = "https://tools.ietf.org/html/rfc9110#section-15.5.5",
        ["title"] = "Contact not found.",
        ["status"] = 404,
        ["detail"] = $"Contact {ExampleId} was not found.",
    };

    private static JsonObject ConflictProblem() => new()
    {
        ["type"] = "https://tools.ietf.org/html/rfc9110#section-15.5.10",
        ["title"] = "The contact was changed by someone else.",
        ["status"] = 409,
        ["detail"] = "Reload the contact and apply your changes to the current version.",
    };

    /// <summary>CLR type to the example rendered for it. A factory per entry, because a JsonNode has one parent.</summary>
    private static readonly Dictionary<Type, Func<JsonNode>> Examples = new()
    {
        [typeof(ContactAddress)] = Address,
        [typeof(CreateContactCommand)] = CreateContact,
        [typeof(UpdateContactCommand)] = UpdateContact,
        [typeof(ContactDetail)] = ContactDetail,
        [typeof(ContactListItem)] = ContactListItem,
        [typeof(PagedResult<ContactListItem>)] = PageOfContacts,
        [typeof(HttpValidationProblemDetails)] = ValidationProblem,
        [typeof(ValidationProblemDetails)] = ValidationProblem,
        [typeof(ProblemDetails)] = NotFoundProblem,
    };

    /// <summary>
    /// One ProblemDetails schema serves 404 and 409, so the status that tells them apart is what
    /// picks the example. These are attached per response rather than per schema.
    /// </summary>
    private static readonly Dictionary<string, Func<JsonNode>> ProblemsByStatus = new(StringComparer.Ordinal)
    {
        ["400"] = ValidationProblem,
        ["404"] = NotFoundProblem,
        ["409"] = ConflictProblem,
    };

    /// <summary>
    /// Query and path parameters, which carry no schema of their own to hang an example on. The sort
    /// and direction sets are closed, so the allowed values are spelled out rather than guessed at.
    /// </summary>
    private static readonly Dictionary<string, (Func<JsonNode> Example, string? Description)> Parameters =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["search"] = (() => "bakker", "Case-insensitive substring of the first name, surname or city."),
            ["sort"] = (() => "surname", "One of surname, firstName, city, dateOfBirth."),
            ["direction"] = (() => "asc", "One of asc, desc."),
            ["page"] = (() => 1, "One-based."),
            ["size"] = (() => GetContactsQuery.DefaultSize, $"1 to {GetContactsQuery.MaximumSize}."),
            ["id"] = (() => ExampleId, null),
        };

    public static IServiceCollection AddConfiguredOpenApi(this IServiceCollection services) =>
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "Contacts Manager",
                    Version = "v1",
                    Description =
                        "Personal contacts: name, date of birth, address, phone number and IBAN. "
                        + "The list response carries only a masked IBAN; the full value is on the detail "
                        + "response, alongside the version an update must send back.",
                };
                return Task.CompletedTask;
            });

            options.AddSchemaTransformer((schema, context, _) =>
            {
                if (Examples.TryGetValue(context.JsonTypeInfo.Type, out var example))
                {
                    // A list, not the singular Example: OpenAPI 3.1 dropped the latter, and
                    // Microsoft.OpenApi marks it obsolete.
                    schema.Examples = [example()];
                }

                return Task.CompletedTask;
            });

            options.AddOperationTransformer((operation, _, _) =>
            {
                foreach (var parameter in operation.Parameters ?? [])
                {
                    if (parameter is not OpenApiParameter concrete
                        || !Parameters.TryGetValue(parameter.Name ?? string.Empty, out var described))
                    {
                        continue;
                    }

                    concrete.Example = described.Example();
                    concrete.Description ??= described.Description;
                }

                foreach (var (status, response) in operation.Responses ?? [])
                {
                    if (!ProblemsByStatus.TryGetValue(status, out var problem))
                    {
                        continue;
                    }

                    foreach (var content in response.Content?.Values ?? [])
                    {
                        content.Example = problem();
                    }
                }

                return Task.CompletedTask;
            });
        });
}
