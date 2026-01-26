using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Teboraw.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddThoughtTitleAndTopicTree : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Thoughts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TopicTree",
                table: "Thoughts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "Thoughts");

            migrationBuilder.DropColumn(
                name: "TopicTree",
                table: "Thoughts");
        }
    }
}
