package github.sarthakdev143.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
		System.out.println("\n\n\n\n===================================\n" +
				"      Server Status: STARTED       \n" +
				"-----------------------------------\n" +
				"            Port : 8080              \n" +
				"-----------------------------------\n" +
				"        "
				+ java.time.LocalDateTime.now()
						.format(java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"))
				+ "\n" +
				"===================================\n\n");
	}

}
