import { NextRequest, NextResponse } from 'next/server';

const API_URL = 'https://vincent-api.proweaver.app/orchestra/toolslogin';
const API_KEY = 'f3ff663595dc15d72c1c9067f9a91ba5cd974782';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { useremail, password } = body;

    if (!useremail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Make request to external API
    const formData = new URLSearchParams();
    formData.append('useremail', useremail);
    formData.append('password', password);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'TOOLKEYAPI': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Login failed' },
        { status: response.status }
      );
    }

    // Check the response structure - based on PHP code, it checks data.data.form_status
    // The API response structure should be: { data: { form_status: bool, form_message: string, data: {...} } }
    // But it might also be nested differently, so we check multiple possible structures
    let formStatus = false;
    let formMessage = '';
    let userData = null;

    // Check for nested structure: data.data.form_status (as per PHP code)
    if (data.data?.form_status !== undefined) {
      formStatus = data.data.form_status === true;
      formMessage = data.data.form_message || '';
      userData = data.data.data;
    }
    // Check for flat structure: data.form_status
    else if (data.form_status !== undefined) {
      formStatus = data.form_status === true;
      formMessage = data.form_message || '';
      userData = data.data || data;
    }
    // Check for user object structure: user.form_status
    else if (data.user?.form_status !== undefined) {
      formStatus = data.user.form_status === true;
      formMessage = data.user.form_message || '';
      userData = data.user.data || data.user;
    }

    // If form_status is false or not found, login failed
    if (!formStatus) {
      return NextResponse.json(
        { error: formMessage || 'Invalid email and/or password' },
        { status: 401 }
      );
    }

    // Return success response with user data from the API
    return NextResponse.json({
      success: true,
      token: data.token || data.access_token || null,
      user: userData || { email: useremail },
      message: data.message || formMessage || 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}


