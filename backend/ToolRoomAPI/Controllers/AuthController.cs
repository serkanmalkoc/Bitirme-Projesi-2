using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ToolRoomAPI.Data;
using ToolRoomAPI.Dtos;
using ToolRoomAPI.Models;

namespace ToolRoomAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ToolRoomDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(
            ToolRoomDbContext context,
            IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(x => x.Username == dto.Username);

            if (existingUser != null)
            {
                return BadRequest("Bu kullanıcı adı zaten kullanılıyor.");
            }

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            var user = new User
            {
                FullName = dto.FullName,
                Username = dto.Username,
                Password = hashedPassword,
                Role = dto.Role
            };

            _context.Users.Add(user);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                Message = "Kullanıcı başarıyla oluşturuldu.",
                user.Id,
                user.FullName,
                user.Username,
                user.Role
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Username == dto.Username);

            if (user == null)
            {
                return Unauthorized("Kullanıcı adı veya şifre hatalı.");
            }

            var isPasswordCorrect = BCrypt.Net.BCrypt.Verify(
                dto.Password,
                user.Password
            );

            if (!isPasswordCorrect)
            {
                return Unauthorized("Kullanıcı adı veya şifre hatalı.");
            }

            var token = CreateToken(user);

            return Ok(new
            {
                Message = "Giriş başarılı.",
                user.Id,
                user.FullName,
                user.Username,
                user.Role,
                Token = token
            });
        }

        private string CreateToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("FullName", user.FullName)
            };

            var jwtKey = _configuration["Jwt:Key"];
            var jwtIssuer = _configuration["Jwt:Issuer"];
            var jwtAudience = _configuration["Jwt:Audience"];

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey!)
            );

            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.Now.AddHours(3),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}