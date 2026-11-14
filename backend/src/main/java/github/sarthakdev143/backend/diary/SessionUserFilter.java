package github.sarthakdev143.backend.diary;

import java.time.Instant;
import java.util.Arrays;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SessionUserFilter extends OncePerRequestFilter {
    public static final String USER_ID = "diary.userId";
    static final String[] COOKIES = { "next-auth.session-token", "__Secure-next-auth.session-token" };

    private final MongoSessionLookup sessions;

    public SessionUserFilter(MongoSessionLookup sessions) {
        this.sessions = sessions;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, java.io.IOException {
        sessions.userId(token(request.getCookies()), Instant.now())
                .ifPresent(userId -> request.setAttribute(USER_ID, userId));
        if (request.getRequestURI().startsWith("/api/") && request.getAttribute(USER_ID) == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    static String token(Cookie[] cookies) {
        if (cookies == null) {
            return "";
        }
        return Arrays.stream(cookies)
                .filter(cookie -> Arrays.asList(COOKIES).contains(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse("");
    }
}
