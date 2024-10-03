package petadoption.api.user;

import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import petadoption.api.user.dtos.CenterDto;
import petadoption.api.user.dtos.LoginDto;
import petadoption.api.user.dtos.OwnerDto;
import petadoption.api.user.dtos.UserDto;

import java.util.List;
import java.util.Optional;

@Log4j2
@Service
public class UserService {
    // Inject repositories and password encoder
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PotentialOwnerRepository potentialOwnerRepository;
    @Autowired
    private AdoptionCenterRepository adoptionCenterRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<User> findAllUsers(){ return userRepository.findAll();}
    public Optional<User> findUser(Long userId) {
        return userRepository.findById(userId);
    }
    public Optional<AdoptionCenter> findAdoptionCenter(Long userId) {return adoptionCenterRepository.findById(userId);}
    public Optional<PotentialOwner> findPotentialOwner(Long userId) {return potentialOwnerRepository.findById(userId);}
    public Optional<User> findUserByEmail(String userEmail){return userRepository.findUserByEmailAddress(userEmail);}

    public Long registerOwner(OwnerDto ownerDto) {
        // Encode password using BCrypt
        String encodedPassword = passwordEncoder.encode(ownerDto.getPassword());

        // Set PotentialOwner info
        PotentialOwner potentialOwner = getPotentialOwner(ownerDto, encodedPassword);

        // Check for existing users with the same email address
        if (potentialOwnerRepository.findPotentialOwnerByEmailAddress(potentialOwner.getEmailAddress()).isPresent()) {
            log.warn("Duplicate owner attempt for email: {}", potentialOwner.getEmailAddress());
            return null;
        }

        // Save the user to the database
        PotentialOwner savedUser = potentialOwnerRepository.save(potentialOwner);

        // Return status of registration
        return savedUser.getId();
    }

    private static PotentialOwner getPotentialOwner(OwnerDto ownerDto, String encodedPassword) {
        PotentialOwner potentialOwner = new PotentialOwner();
        potentialOwner.setEmailAddress(ownerDto.getEmailAddress());
        potentialOwner.setPassword(encodedPassword);
        potentialOwner.setProfilePicPath(ownerDto.getProfilePicPath());
        potentialOwner.setAccountType(ownerDto.getAccountType());
        potentialOwner.setNameFirst(ownerDto.getNameFirst());
        potentialOwner.setNameFirst(ownerDto.getNameLast());
        return potentialOwner;
    }

    public Long registerCenter(CenterDto centerDto) {
        // Encode password using BCrypt
        String encodedPassword = passwordEncoder.encode(centerDto.getPassword());

        // Set user info
        AdoptionCenter adoptionCenter = getAdoptionCenter(centerDto, encodedPassword);

        // Check for existing users with the same email address
        if (adoptionCenterRepository.findAdoptionCenterByEmailAddress(adoptionCenter.getEmailAddress()).isPresent()) {
            log.warn("Duplicate center attempt for email: {}", adoptionCenter.getEmailAddress());
            return null;
        }

        // Save the user to the database
        AdoptionCenter savedUser = adoptionCenterRepository.save(adoptionCenter);

        // Return status of registration
        return savedUser.getId();
    }

    private static AdoptionCenter getAdoptionCenter(CenterDto centerDto, String encodedPassword) {
        AdoptionCenter adoptionCenter = new AdoptionCenter();
        adoptionCenter.setEmailAddress(centerDto.getEmailAddress());
        adoptionCenter.setPassword(encodedPassword);
        adoptionCenter.setAccountType(centerDto.getAccountType());
        adoptionCenter.setProfilePicPath(centerDto.getProfilePicPath());
        adoptionCenter.setName(centerDto.getName());
        adoptionCenter.setAddress(centerDto.getAddress());
        adoptionCenter.setCity(centerDto.getCity());
        adoptionCenter.setState(centerDto.getState());
        adoptionCenter.setZipCode(centerDto.getZipCode());
        return adoptionCenter;
    }

    public long loginUser(LoginDto loginDto) {
        // See if there is a user under the email provided
        var userOptional = findUserByEmail(loginDto.getEmailAddress());
        // If user not found, return false and log it
        if (userOptional.isEmpty()) {
            log.warn("Username not found for login: {}", loginDto.getEmailAddress());
            return -1;
        }

        // Extract user from optional
        User user = userOptional.get();

        // Compare encoded password with the one provided
        if(! passwordEncoder.matches(loginDto.getPassword(), user.getPassword())) {
            return -1;
        }
        return user.id;
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    // USED TO CLEAR TABLE FOR TESTING: See misc/ClearDataController
    @Transactional
    public void clearData() {
        userRepository.deleteAll();
    }

}
