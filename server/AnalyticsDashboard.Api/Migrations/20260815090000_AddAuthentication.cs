using AnalyticsDashboard.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsDashboard.Api.Migrations;

[DbContext(typeof(AnalyticsDbContext))]
[Migration("20260815090000_AddAuthentication")]
public sealed class AddAuthentication : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "app_users",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                normalized_email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                password_hash = table.Column<string>(type: "text", nullable: false),
                created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_app_users", x => x.id));

        migrationBuilder.AddColumn<Guid>(
            name: "owner_id",
            table: "datasets",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "ux_app_users_normalized_email",
            table: "app_users",
            column: "normalized_email",
            unique: true);
        migrationBuilder.CreateIndex(
            name: "ix_datasets_owner_id_created_at",
            table: "datasets",
            columns: new[] { "owner_id", "created_at" });
        migrationBuilder.AddForeignKey(
            name: "FK_datasets_app_users_owner_id",
            table: "datasets",
            column: "owner_id",
            principalTable: "app_users",
            principalColumn: "id",
            onDelete: ReferentialAction.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey("FK_datasets_app_users_owner_id", "datasets");
        migrationBuilder.DropIndex("ix_datasets_owner_id_created_at", "datasets");
        migrationBuilder.DropColumn("owner_id", "datasets");
        migrationBuilder.DropTable("app_users");
    }
}
