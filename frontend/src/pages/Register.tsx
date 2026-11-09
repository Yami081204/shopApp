import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllContexts } from "@/hooks/useAllContexts";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import axios from "axios";
import { getEmailError, getNameError, getPasswordError, normalizeName, sanitizeNameInput } from "@/lib/accountValidation";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const isNameComposing = useRef(false);
  
  const { register, isAuthLoading } = useAllContexts();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "name" && !isNameComposing.current ? sanitizeNameInput(value) : value,
    }));
  };

  const handleNameCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isNameComposing.current = false;
    const name = sanitizeNameInput(e.currentTarget.value);
    setFormData((prev) => ({ ...prev, name }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const nameError = getNameError(formData.name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const emailError = getEmailError(formData.email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = getPasswordError(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (!termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }
    
    try {
      const name = normalizeName(formData.name);
      await register(name, formData.email.trim().toLowerCase(), formData.password);
      toast({
        title: "Registration successful",
        description: `Welcome ${name} to Bloom Beauty!`,
      });
      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message) {
        // Xử lý lỗi từ API
        setError(error.response.data.message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Registration failed. Please try again later.");
      }
    }
  };
  
  // Translate error messages to English
  const translateError = (errorMessage: string) => {
    const errorMap: Record<string, string> = {
      "User already exists": "Email is already registered",
      "Invalid user data": "Invalid information",
      "Server Error": "Server error, please try again later",
      "Registration failed. Please try again.": "Registration failed. Please try again later."
    };
    
    return errorMap[errorMessage] || errorMessage;
  };
  
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  return (
    <>
      <div className="container flex items-center justify-center py-16">
        <motion.div 
          className="mx-auto max-w-md"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-medium text-beauty-800">Register</h1>
            <p className="mt-2 text-muted-foreground">
              Create an account to receive many attractive offers
            </p>
          </div>
          
          <div className="rounded-lg border bg-card p-8 shadow-lg">
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <motion.div 
                  className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {translateError(error)}
                  </div>
                </motion.div>
              )}
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    className="h-11"
                    value={formData.name}
                    onChange={handleChange}
                    onCompositionStart={() => { isNameComposing.current = true; }}
                    onCompositionEnd={handleNameCompositionEnd}
                    maxLength={255}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Chỉ dùng chữ cái, khoảng trắng, dấu nối (-) hoặc dấu nháy (').</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="h-11"
                    value={formData.email}
                    onChange={handleChange}
                    maxLength={254}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                      value={formData.password}
                      onChange={handleChange}
                      maxLength={72}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Password must meet the following requirements:</p>
                    <ul className="list-disc pl-4">
                      <li>At least 8 characters (72 bytes maximum)</li>
                      <li>At least 1 uppercase letter</li>
                      <li>At least 1 number</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      maxLength={72}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    I agree to the {" "}
                    <Link to="/terms" className="text-beauty-600 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and {" "}
                    <Link to="/privacy" className="text-beauty-600 hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-11 mt-4 bg-beauty-600 hover:bg-beauty-700 text-black border border-gray-200 hover:bg-gray-100 transition-colors px-4 py-2 rounded-lg shadow-sm hover:shadow-md"
                  disabled={isAuthLoading}
                >
                  {isAuthLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register
                    </div>
                  )}
                </Button>
              </div>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-beauty-600 hover:text-beauty-800 font-medium hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Register;
