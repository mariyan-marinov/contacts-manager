using System.Text.Json;
using ContactsManager.Api.Startup;
using ContactsManager.Application;
using ContactsManager.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Validation errors are keyed by field name, and camel-casing those keys keeps the whole payload in
// one convention for the client. ProblemDetails is written by IProblemDetailsService rather than by
// MVC, so it reads these options and not the ones on AddControllers.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddConfiguredCors(builder.Configuration);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration.GetConnectionString("Contacts")
    ?? throw new InvalidOperationException("Connection string 'Contacts' is not configured."));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

await app.MigrateAndSeedAsync();

app.MapTestSupportEndpoints();
app.MapControllers();

await app.RunAsync();

/// <summary>Named so the API test project can reach the entry point through WebApplicationFactory.</summary>
public partial class Program;
