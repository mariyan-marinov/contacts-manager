using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ContactsManager.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        // Two hand-edits to the generated output, both forced by EF Core 10 limitations:
        //   1. The `xmin` column was removed. It is a Postgres system column that every table already
        //      has — CREATE TABLE rejects it by name — but EF emits it because the model maps
        //      Contact.Version onto it. The mapping is right; only the CreateTable line was wrong.
        //   2. The (surname, first_name) index is declared below. EF cannot express an index over
        //      complex type properties, so it cannot appear in the model configuration.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "contacts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    address_city = table.Column<string>(type: "character varying(85)", maxLength: 85, nullable: false),
                    address_country = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    address_house_number = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    address_postal_code = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    address_street = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    date_of_birth = table.Column<DateOnly>(type: "date", nullable: false),
                    iban = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: false),
                    first_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    surname = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contacts", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_contacts_surname_first_name",
                table: "contacts",
                columns: ["surname", "first_name"]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "contacts");
        }
    }
}
